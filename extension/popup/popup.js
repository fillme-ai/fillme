// Profile fields to save/load
var PROFILE_FIELDS = [
  'name', 'nameEnFirst', 'nameEnLast', 'email', 'phone', 'address', 'birth', 'gender',
  'school', 'major', 'gpa', 'schoolStart', 'schoolEnd', 'degree',
  'company', 'position', 'workStart', 'workEnd', 'workDesc',
  'certs', 'langTest', 'langScore', 'military',
  'salaryDesired', 'salaryPrev', 'veteran', 'disability'
];

// ===== Tab switching =====
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ===== Load saved profile =====
chrome.storage.local.get('profile', function(data) {
  if (data.profile) {
    PROFILE_FIELDS.forEach(function(field) {
      var el = document.getElementById(field);
      if (el && data.profile[field]) {
        el.value = data.profile[field];
      }
    });
  }
});

// ===== Save profile =====
document.getElementById('btnSave').addEventListener('click', function() {
  var profile = {};
  PROFILE_FIELDS.forEach(function(field) {
    var el = document.getElementById(field);
    if (el) profile[field] = el.value;
  });

  chrome.storage.local.set({ profile: profile }, function() {
    var status = document.getElementById('saveStatus');
    status.textContent = '✅ 이력서가 저장되었습니다!';
    status.className = 'status success';
    setTimeout(function() { status.className = 'status'; }, 3000);
  });
});

// ===== Detect fields on current page =====
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (!tabs[0]) return;
  chrome.tabs.sendMessage(tabs[0].id, { action: 'detectFields' }, function(response) {
    if (chrome.runtime.lastError) {
      document.getElementById('fieldCount').textContent = '0';
      return;
    }
    if (response && response.count) {
      document.getElementById('fieldCount').textContent = response.count;
    } else {
      document.getElementById('fieldCount').textContent = '0';
    }
  });
});

// ===== Auto-fill button =====
document.getElementById('btnFill').addEventListener('click', function() {
  chrome.storage.local.get('profile', function(data) {
    if (!data.profile || !data.profile.name) {
      var status = document.getElementById('fillStatus');
      status.textContent = '⚠️ 먼저 "내 이력서" 탭에서 정보를 입력해주세요.';
      status.className = 'status error';
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'fillForm',
        profile: data.profile
      }, function(response) {
        var status = document.getElementById('fillStatus');
        if (chrome.runtime.lastError) {
          status.textContent = '⚠️ 이 페이지에서는 동작하지 않습니다. 채용 사이트에서 시도해주세요.';
          status.className = 'status error';
          return;
        }
        if (response && response.filled > 0) {
          status.textContent = '✅ ' + response.filled + '개 항목 자동 입력 완료!';
          status.className = 'status success';
        } else {
          status.textContent = '⚠️ 입력 가능한 필드를 찾지 못했습니다.';
          status.className = 'status error';
        }
      });
    });
  });
});

// ===== Gemini API =====
var GEMINI_API_KEY = 'AIzaSyDwEwq_siYvy1NACYW99iTRMSz6Mtqg6p8';

// Mask sensitive info before sending to AI
function maskSensitiveInfo(text) {
  var masks = {};

  // 전화번호 마스킹
  var phoneMatch = text.match(/01[0-9][\-\s\.]*\d{3,4}[\-\s\.]*\d{4}/g);
  if (phoneMatch) {
    phoneMatch.forEach(function(p, i) {
      var key = '__PHONE' + i + '__';
      masks[key] = p;
      text = text.replace(p, key);
    });
  }

  // 이메일 마스킹
  var emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
  if (emailMatch) {
    emailMatch.forEach(function(e, i) {
      var key = '__EMAIL' + i + '__';
      masks[key] = e;
      text = text.replace(e, key);
    });
  }

  // 주소 마스킹 (시/도 + 상세주소)
  var addrMatch = text.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣0-9\s\-\(\),\.·]{5,60}/g);
  if (addrMatch) {
    addrMatch.forEach(function(a, i) {
      var key = '__ADDR' + i + '__';
      masks[key] = a;
      text = text.replace(a, key);
    });
  }

  return { text: text, masks: masks };
}

// Unmask values in parsed result
function unmaskResult(parsed, masks) {
  for (var field in parsed) {
    if (typeof parsed[field] === 'string') {
      for (var key in masks) {
        parsed[field] = parsed[field].replace(key, masks[key]);
      }
    }
    if (Array.isArray(parsed[field])) {
      parsed[field] = parsed[field].map(function(item) {
        if (typeof item === 'object') {
          for (var f in item) {
            if (typeof item[f] === 'string') {
              for (var key in masks) {
                item[f] = item[f].replace(key, masks[key]);
              }
            }
          }
        }
        return item;
      });
    }
  }
  return parsed;
}

// Call Gemini API to parse resume text
function parseWithGemini(text) {
  // 마스킹
  var masked = maskSensitiveInfo(text);
  var maskedText = masked.text;
  var masks = masked.masks;

  var prompt = '다음은 이력서에서 추출한 텍스트입니다. 아래 JSON 형식으로 정확하게 파싱해주세요.\n' +
    '중요: 반드시 유효한 JSON만 출력하세요. 다른 텍스트는 출력하지 마세요.\n' +
    '배열 항목은 모두 포함해주세요 (경력, 학력, 자격증 등).\n\n' +
    '출력 JSON 형식:\n' +
    '{\n' +
    '  "name": "이름",\n' +
    '  "email": "이메일",\n' +
    '  "phone": "연락처",\n' +
    '  "address": "주소",\n' +
    '  "birth": "YYYY-MM-DD",\n' +
    '  "gender": "male 또는 female",\n' +
    '  "education": [{"school": "학교명", "major": "전공", "degree": "학위(고등학교/전문대/대학교/대학원)", "start": "YYYY-MM", "end": "YYYY-MM", "gpa": "학점"}],\n' +
    '  "careers": [{"company": "회사명", "department": "부서", "position": "직급", "start": "YYYY-MM", "end": "YYYY-MM 또는 재직중", "description": "주요업무 요약"}],\n' +
    '  "certificates": ["자격증1", "자격증2"],\n' +
    '  "languages": [{"test": "시험명", "score": "점수"}],\n' +
    '  "military": "해병만기전역 등 원문 그대로",\n' +
    '  "skills": ["스킬1", "스킬2"]\n' +
    '}\n\n' +
    '이력서 텍스트:\n' + maskedText;

  return fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    try {
      var responseText = data.candidates[0].content.parts[0].text;
      // JSON 블록 추출 (```json ... ``` 형태 대응)
      var jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/) ||
                      responseText.match(/```\s*([\s\S]*?)```/) ||
                      [null, responseText];
      var jsonStr = jsonMatch[1].trim();
      var parsed = JSON.parse(jsonStr);
      // 마스킹 해제
      parsed = unmaskResult(parsed, masks);
      return parsed;
    } catch(e) {
      console.error('Gemini parse error:', e, data);
      return null;
    }
  })
  .catch(function(err) {
    console.error('Gemini API error:', err);
    return null;
  });
}

// Convert Gemini result to profile fields
function geminiToProfile(parsed) {
  var profile = {};
  if (!parsed) return profile;

  profile.name = parsed.name || '';
  profile.email = parsed.email || '';
  profile.phone = parsed.phone || '';
  profile.address = parsed.address || '';
  profile.birth = parsed.birth || '';
  profile.gender = parsed.gender || '';

  // 학력 (가장 최근 = 첫 번째)
  if (parsed.education && parsed.education.length > 0) {
    var edu = parsed.education[0];
    profile.school = edu.school || '';
    profile.major = edu.major || '';
    profile.gpa = edu.gpa || '';
    profile.schoolStart = edu.start || '';
    profile.schoolEnd = edu.end || '';
    profile.degree = edu.degree || '';
  }

  // 경력 (가장 최근 = 첫 번째)
  if (parsed.careers && parsed.careers.length > 0) {
    var career = parsed.careers[0];
    profile.company = career.company || '';
    profile.position = career.position || '';
    profile.workStart = career.start || '';
    profile.workEnd = career.end || '';
    profile.workDesc = career.description || '';
  }

  // 자격증
  if (parsed.certificates && parsed.certificates.length > 0) {
    profile.certs = parsed.certificates.join(', ');
  }

  // 어학
  if (parsed.languages && parsed.languages.length > 0) {
    profile.langTest = parsed.languages[0].test || '';
    profile.langScore = parsed.languages[0].score || '';
  }

  // 병역
  if (parsed.military) {
    var mil = parsed.military;
    if (/해병/.test(mil)) profile.military = 'done_marine';
    else if (/해군/.test(mil)) profile.military = 'done_navy';
    else if (/공군/.test(mil)) profile.military = 'done_air';
    else if (/군필|만기전역|전역/.test(mil)) profile.military = 'done';
    else if (/면제|비대상/.test(mil)) profile.military = 'exempt';
  }

  // 전체 경력/학력 데이터도 저장 (나중에 사용)
  profile._allCareers = parsed.careers || [];
  profile._allEducation = parsed.education || [];
  profile._allCerts = parsed.certificates || [];
  profile._skills = parsed.skills || [];

  return profile;
}

// ===== Resume File Upload & Parsing =====

// PDF.js worker setup
try {
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
  }
} catch(e) {
  console.log('PDF.js init error:', e);
}

// Upload zone events
var uploadZone = document.getElementById('uploadZone');
var fileInput = document.getElementById('fileInput');

if (uploadZone && fileInput) {
  uploadZone.addEventListener('click', function() { fileInput.click(); });

  uploadZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', function() {
    uploadZone.classList.remove('dragover');
  });
  uploadZone.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', function() {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });
}

function handleFile(file) {
  var ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    parsePDF(file);
  } else {
    alert('현재 PDF 파일만 지원됩니다. DOC/DOCX는 곧 지원 예정입니다.');
  }
}

function parsePDF(file) {
  showParsing(true);

  if (typeof pdfjsLib === 'undefined') {
    showParsing(false);
    alert('PDF 라이브러리를 불러오지 못했습니다.');
    return;
  }

  var reader = new FileReader();
  reader.onload = function() {
    try {
      var typedArray = new Uint8Array(reader.result);
      pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
        var pages = [];
        for (var i = 1; i <= pdf.numPages; i++) {
          pages.push(
            pdf.getPage(i).then(function(page) {
              return page.getTextContent().then(function(content) {
                return content.items.map(function(item) { return item.str; }).join(' ');
              });
            })
          );
        }
        Promise.all(pages).then(function(texts) {
          var allText = texts.join('\n');
          console.log('Extracted text:', allText.substring(0, 500));

          // AI 파싱 시도, 실패 시 로컬 파싱 폴백
          parseWithGemini(allText).then(function(aiResult) {
            var profile, displayResult;
            if (aiResult) {
              profile = geminiToProfile(aiResult);
              displayResult = profile;
              console.log('AI parsed:', aiResult);
            } else {
              profile = parseResumeText(allText);
              displayResult = profile;
              console.log('Fallback local parse:', profile);
            }
            fillProfileFields(profile);
            showParsing(false);
            var count = Object.keys(profile).filter(function(k) {
              return profile[k] && !k.startsWith('_');
            }).length;
            showUploadSuccess(count, displayResult);
          });
        });
      }).catch(function(err) {
        console.error('PDF parse error:', err);
        showParsing(false);
        alert('PDF 파싱 중 오류: ' + err.message);
      });
    } catch(err) {
      console.error('PDF read error:', err);
      showParsing(false);
      alert('PDF 읽기 오류: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

function showParsing(show) {
  var ps = document.getElementById('parsingStatus');
  var uz = document.getElementById('uploadZone');
  if (ps) ps.style.display = show ? 'block' : 'none';
  if (uz) uz.style.display = show ? 'none' : 'block';
}

function showUploadSuccess(count, parsed) {
  var zone = document.getElementById('uploadZone');
  if (zone) {
    zone.innerHTML = '<div class="icon">✅</div><div class="text"><strong>' + (count || 0) + '개 항목 분석 완료!</strong><br>아래에서 확인하고 저장하세요</div>';
    zone.style.borderColor = '#66bb6a';
    zone.style.background = '#e8f5e9';
    zone.style.cursor = 'default';
  }
  // 분석 결과 표시
  var resultDiv = document.getElementById('parseResult');
  var listDiv = document.getElementById('parseResultList');
  if (resultDiv && listDiv && parsed) {
    var fieldNames = {
      name: '이름', nameEnFirst: '영문이름', nameEnLast: '영문성',
      email: '이메일', phone: '연락처', address: '주소', birth: '생년월일',
      gender: '성별', school: '학교', major: '전공', gpa: '학점',
      schoolStart: '입학', schoolEnd: '졸업', company: '회사', position: '직책',
      workStart: '입사일', workEnd: '퇴사일', certs: '자격증',
      langTest: '어학시험', langScore: '어학점수', military: '병역'
    };
    var html = '';
    for (var key in parsed) {
      html += '<div style="margin-bottom:0.3rem;"><strong>' + (fieldNames[key] || key) + ':</strong> ' + parsed[key] + '</div>';
    }
    if (!html) html = '<div style="color:#e53935;">분석된 항목이 없습니다. PDF 형식을 확인해주세요.</div>';
    listDiv.innerHTML = html;
    resultDiv.style.display = 'block';
  }
}

// Parse resume text into structured fields
function parseResumeText(text) {
  var result = {};
  // fullText: 공백 정규화 (줄바꿈 유지)
  var lines = text.split(/\n/).map(function(l) { return l.trim(); });
  var fullText = text.replace(/[ \t]+/g, ' ');
  var flatText = text.replace(/\s+/g, ' ');

  // === 이름 ===
  // "성    명" + 다음에 나오는 한글 2~4자
  var nameMatch = flatText.match(/(?:성\s*명|이름|지원자명?)\s*[:\-\|]?\s*([가-힣]{2,4})/);
  if (nameMatch) result.name = nameMatch[1];

  // === 이메일 ===
  var emailMatch = flatText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  // === 전화번호 ===
  var phoneMatch = flatText.match(/01[0-9][\-\s\.]*\d{3,4}[\-\s\.]*\d{4}/);
  if (phoneMatch) {
    var raw = phoneMatch[0].replace(/[\s\.]/g, '').replace(/-/g, '');
    result.phone = raw.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }

  // === 주소 ===
  // "주    소" 패턴 또는 시/도로 시작
  var addrMatch = flatText.match(/(?:주\s*소|거주지|현주소)\s*[:\-\|]?\s*([가-힣0-9\s\-\(\),\.·]{5,60})/);
  if (addrMatch) result.address = addrMatch[1].trim();
  if (!addrMatch) {
    addrMatch = flatText.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣0-9\s\-\(\),\.·]{5,50}/);
    if (addrMatch) result.address = addrMatch[0].trim();
  }

  // === 생년월일 ===
  var birthMatch = flatText.match(/(?:생년월일|생\s*년\s*월\s*일)\s*[:\-\|]?\s*(\d{4})\s*년?\s*(\d{1,2})\s*월?\s*(\d{1,2})\s*일/);
  if (birthMatch) {
    result.birth = birthMatch[1] + '-' + birthMatch[2].padStart(2,'0') + '-' + birthMatch[3].padStart(2,'0');
  }
  if (!birthMatch) {
    birthMatch = flatText.match(/(?:생년월일|생\s*년\s*월\s*일)\s*[:\-\|]?\s*(\d{4}[\.\-\/]\s?\d{1,2}[\.\-\/]\s?\d{1,2})/);
    if (birthMatch) result.birth = birthMatch[1].replace(/[\.\s\/]/g, '-');
  }

  // === 학력 ===
  // "수원대학교 정보미디어학과 졸업" 형태
  var eduMatch = flatText.match(/([가-힣]+대학교)\s+([가-힣]+(?:학과|학부))\s+졸업/);
  if (eduMatch) {
    result.school = eduMatch[1];
    result.major = eduMatch[2];
  }
  if (!result.school) {
    var schoolMatch = flatText.match(/([가-힣]+대학교)/);
    if (schoolMatch) result.school = schoolMatch[1];
  }
  if (!result.major) {
    var majorMatch = flatText.match(/([가-힣]+(?:학과|학부))/);
    if (majorMatch) result.major = majorMatch[1];
  }

  // 학력 기간: "2014.03 ~ 2018.02" 패턴 (대학교 근처)
  var eduPeriod = flatText.match(/(\d{4})\.(\d{2})\s*~\s*(\d{4})\.(\d{2})\s+[가-힣]+대학교/);
  if (eduPeriod) {
    result.schoolStart = eduPeriod[1] + '-' + eduPeriod[2];
    result.schoolEnd = eduPeriod[3] + '-' + eduPeriod[4];
  }

  // 학점
  var gpaMatch = flatText.match(/(\d\.\d{1,2})\s*[\/\|]\s*(\d\.\d{1,2})/);
  if (gpaMatch) result.gpa = gpaMatch[0].replace('|', '/');

  // === 경력 (가장 최근) ===
  // "2024.08 ~ 재직중  F&F / 웹플랫폼팀 / 대리" 형태
  var careerMatch = flatText.match(/\d{4}\.\d{2}\s*~\s*(?:재직중|현재|재직)\s+([가-힣a-zA-Z&]+)\s*\/\s*([가-힣a-zA-Z]+(?:팀|부|실|파트))\s*\/\s*([가-힣]+)/);
  if (careerMatch) {
    result.company = careerMatch[1].trim();
    result.position = careerMatch[3].trim(); // 직책 (대리, 사원 등)
  }
  if (!result.company) {
    // "㈜무신사" 또는 "회사명" 패턴
    var compMatch = flatText.match(/(?:㈜|\(주\)|주식회사)\s*([가-힣a-zA-Z&]{2,15})/);
    if (compMatch) result.company = compMatch[1].trim();
  }

  // 경력 기간 (가장 최근)
  var workPeriod = flatText.match(/(\d{4})\.(\d{2})\s*~\s*(?:재직중|현재|재직)/);
  if (workPeriod) {
    result.workStart = workPeriod[1] + '-' + workPeriod[2];
    result.workEnd = '재직중';
  }

  // === 자격증 ===
  // "자격사항" 섹션 아래의 내용들
  var certSection = flatText.match(/자격사항\s+([\s\S]{10,200}?)(?=교육사항|병역사항|어학|기타|$)/);
  if (certSection) {
    var certText = certSection[1];
    var certs = certText.match(/([가-힣a-zA-Z]+(?:기사|관리사|자격|기술자격|능력검정)[가-힣0-9\s]*\d*급?)/g);
    if (certs) result.certs = certs.map(function(c) { return c.trim(); }).join(', ');
  }
  if (!result.certs) {
    // 직접 매칭
    var certNames = flatText.match(/(유통관리사[가-힣0-9\s]*\d*급?|그래픽기술자격[가-힣0-9\s]*\d*급?|텔레마케팅관리사|정보처리기사|컴퓨터활용능력[가-힣0-9\s]*\d*급?|한국사능력검정[가-힣0-9\s]*\d*급?|SQLD|ADsP|빅데이터분석기사|공인회계사|세무사|공인중개사|사회복지사)/g);
    if (certNames) result.certs = certNames.map(function(c) { return c.trim(); }).join(', ');
  }

  // === 어학 ===
  var langMatch = flatText.match(/(TOEIC|TOEFL|OPIC|TEPS|토익|토플|오픽|텝스|IELTS|HSK|JLPT|JPT)/i);
  if (langMatch) {
    result.langTest = langMatch[1].toUpperCase()
      .replace('토익', 'TOEIC').replace('토플', 'TOEFL')
      .replace('오픽', 'OPIC').replace('텝스', 'TEPS');
  }
  var scoreMatch = flatText.match(/(?:TOEIC|TOEFL|OPIC|TEPS|토익|토플|오픽|텝스|IELTS|HSK|JLPT|JPT)\s*[:\-\|]?\s*(\d{2,4}점?|[A-Z]{1,3}\d?|Level\s?\d|N\d)/i);
  if (scoreMatch) result.langScore = scoreMatch[1].replace('점','');

  // === 병역 ===
  if (/해병.*전역|해병만기전역/.test(flatText)) {
    result.military = 'done_marine';
  } else if (/해군.*전역/.test(flatText)) {
    result.military = 'done_navy';
  } else if (/공군.*전역/.test(flatText)) {
    result.military = 'done_air';
  } else if (/군필|만기전역|병장|상병|전역/.test(flatText)) {
    result.military = 'done';
  } else if (/면제|비대상/.test(flatText)) {
    result.military = 'exempt';
  }

  // === 성별 ===
  if (/남성|male/i.test(flatText)) result.gender = 'male';
  else if (/여성|female/i.test(flatText)) result.gender = 'female';

  return result;
}

// Fill profile form fields with parsed data
function fillProfileFields(parsed) {
  var filled = 0;
  PROFILE_FIELDS.forEach(function(field) {
    var el = document.getElementById(field);
    if (el && parsed[field]) {
      el.value = parsed[field];
      el.style.transition = 'background-color 0.3s';
      el.style.backgroundColor = '#e8f5e9';
      filled++;
      setTimeout(function() { el.style.backgroundColor = ''; }, 5000);
    }
  });
  return filled;
}
