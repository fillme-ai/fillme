// Profile fields to save/load
var BASIC_FIELDS = [
  'name', 'nameEnFirst', 'nameEnLast', 'email', 'phone', 'address', 'birth', 'gender',
  'langTest', 'langScore', 'military',
  'salaryDesired', 'salaryPrev', 'veteran', 'disability'
];

// For backward compatibility
var PROFILE_FIELDS = BASIC_FIELDS;

// ===== Dynamic Education/Career/Cert Entries =====
var eduCount = 0;
var careerCount = 0;
var certCount = 0;

function addEducation(data) {
  eduCount++;
  var i = eduCount;
  var d = data || {};
  var html = '<div class="entry-card" id="edu-' + i + '">' +
    '<button class="remove-btn" data-remove="edu-' + i + '">×</button>' +
    '<div class="entry-num">학력 ' + i + '</div>' +
    '<div class="field"><input type="text" data-field="school" placeholder="학교명" value="' + (d.school||'') + '"></div>' +
    '<div class="row"><div class="field"><input type="text" data-field="major" placeholder="전공" value="' + (d.major||'') + '"></div>' +
    '<div class="field"><input type="text" data-field="gpa" placeholder="학점 (3.8/4.5)" value="' + (d.gpa||'') + '"></div></div>' +
    '<div class="row"><div class="field"><input type="text" data-field="start" placeholder="입학 (2014-03)" value="' + (d.start||'') + '"></div>' +
    '<div class="field"><input type="text" data-field="end" placeholder="졸업 (2018-02)" value="' + (d.end||'') + '"></div></div>' +
    '<div class="field"><select data-field="degree">' +
    '<option value="">학력구분</option><option value="high"' + (d.degree==='고등학교'?' selected':'') + '>고등학교</option>' +
    '<option value="college"' + (d.degree==='전문대'?' selected':'') + '>전문대</option>' +
    '<option value="university"' + (d.degree==='대학교'||d.degree==='4년제'?' selected':'') + '>대학교 (4년제)</option>' +
    '<option value="master"' + (d.degree==='대학원'||d.degree==='석사'?' selected':'') + '>대학원 (석사)</option>' +
    '</select></div></div>';
  document.getElementById('educationList').insertAdjacentHTML('beforeend', html);
}

function addCareer(data) {
  careerCount++;
  var i = careerCount;
  var d = data || {};
  var html = '<div class="entry-card" id="career-' + i + '">' +
    '<button class="remove-btn" data-remove="career-' + i + '">×</button>' +
    '<div class="entry-num">경력 ' + i + '</div>' +
    '<div class="field"><input type="text" data-field="company" placeholder="회사명" value="' + (d.company||'') + '"></div>' +
    '<div class="row"><div class="field"><input type="text" data-field="department" placeholder="부서" value="' + (d.department||'') + '"></div>' +
    '<div class="field"><input type="text" data-field="position" placeholder="직급" value="' + (d.position||'') + '"></div></div>' +
    '<div class="row"><div class="field"><input type="text" data-field="start" placeholder="입사 (2020-03)" value="' + (d.start||'') + '"></div>' +
    '<div class="field"><input type="text" data-field="end" placeholder="퇴사 (2023-06)" value="' + (d.end||'') + '"></div></div>' +
    '<div class="field"><textarea data-field="description" placeholder="주요 업무">' + (d.description||'') + '</textarea></div></div>';
  document.getElementById('careerList').insertAdjacentHTML('beforeend', html);
}

function addCert(data) {
  certCount++;
  var i = certCount;
  var d = data || {};
  var val = (typeof d === 'string') ? d : (d.name || '');
  var html = '<div class="entry-card" id="cert-' + i + '" style="padding:0.5rem 0.8rem;">' +
    '<button class="remove-btn" data-remove="cert-' + i + '">×</button>' +
    '<div class="field" style="margin:0;padding-right:1.5rem;"><input type="text" data-field="certName" placeholder="자격증명" value="' + val + '"></div></div>';
  document.getElementById('certList').insertAdjacentHTML('beforeend', html);
}

function removeEntry(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}

// Collect all dynamic entries into profile data
function collectAllData() {
  var profile = {};

  // Basic fields
  BASIC_FIELDS.forEach(function(field) {
    var el = document.getElementById(field);
    if (el) profile[field] = el.value;
  });

  // Education entries
  profile.education = [];
  document.querySelectorAll('#educationList .entry-card').forEach(function(card) {
    var entry = {};
    card.querySelectorAll('[data-field]').forEach(function(inp) {
      entry[inp.dataset.field] = inp.value;
    });
    if (entry.school) profile.education.push(entry);
  });

  // Career entries
  profile.careers = [];
  document.querySelectorAll('#careerList .entry-card').forEach(function(card) {
    var entry = {};
    card.querySelectorAll('[data-field]').forEach(function(inp) {
      entry[inp.dataset.field] = inp.value;
    });
    if (entry.company) profile.careers.push(entry);
  });

  // Cert entries
  profile.certificates = [];
  document.querySelectorAll('#certList .entry-card').forEach(function(card) {
    var inp = card.querySelector('[data-field="certName"]');
    if (inp && inp.value) profile.certificates.push(inp.value);
  });

  // Backward compat: first entries into flat fields
  if (profile.education.length > 0) {
    var e = profile.education[0];
    profile.school = e.school; profile.major = e.major; profile.gpa = e.gpa;
    profile.schoolStart = e.start; profile.schoolEnd = e.end; profile.degree = e.degree;
  }
  if (profile.careers.length > 0) {
    var c = profile.careers[0];
    profile.company = c.company; profile.position = c.position;
    profile.workStart = c.start; profile.workEnd = c.end; profile.workDesc = c.description;
  }
  if (profile.certificates.length > 0) {
    profile.certs = profile.certificates.join(', ');
  }

  return profile;
}

// + buttons
document.getElementById('addEduBtn').addEventListener('click', function() { addEducation(); });
document.getElementById('addCareerBtn').addEventListener('click', function() { addCareer(); });
document.getElementById('addCertBtn').addEventListener('click', function() { addCert(); });

// - buttons (event delegation)
document.getElementById('tab-profile').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-remove]');
  if (btn) {
    var id = btn.getAttribute('data-remove');
    var el = document.getElementById(id);
    if (el) el.remove();
    autoSave();
  }
});

// ===== API Key save =====
document.getElementById('saveApiKey').addEventListener('click', function() {
  var key = document.getElementById('apiKeyInput').value;
  if (!key.startsWith('AIza')) {
    var s = document.getElementById('apiKeyStatus');
    s.textContent = '⚠️ AIza로 시작하는 유효한 Gemini 키를 입력하세요';
    s.className = 'status error';
    return;
  }
  GEMINI_API_KEY = key;
  chrome.storage.local.set({ apiKey: key }, function() {
    var s = document.getElementById('apiKeyStatus');
    s.textContent = '✅ API 키가 저장되었습니다';
    s.className = 'status success';
    document.getElementById('apiKeyInput').value = '••••' + key.slice(-8);
    setTimeout(function() { s.className = 'status'; }, 2000);
  });
});

// Initialize with one empty entry each
addEducation();
addCareer();
addCert();

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
    // Basic fields
    BASIC_FIELDS.forEach(function(field) {
      var el = document.getElementById(field);
      if (el && data.profile[field]) {
        el.value = data.profile[field];
      }
    });

    // Education entries
    if (data.profile.education && data.profile.education.length > 0) {
      document.getElementById('educationList').innerHTML = '';
      eduCount = 0;
      data.profile.education.forEach(function(edu) { addEducation(edu); });
    }

    // Career entries
    if (data.profile.careers && data.profile.careers.length > 0) {
      document.getElementById('careerList').innerHTML = '';
      careerCount = 0;
      data.profile.careers.forEach(function(career) { addCareer(career); });
    }

    // Cert entries
    if (data.profile.certificates && data.profile.certificates.length > 0) {
      document.getElementById('certList').innerHTML = '';
      certCount = 0;
      data.profile.certificates.forEach(function(cert) { addCert(cert); });
    }
  }
});

// ===== Auto-save on any input change =====
var saveTimer = null;
function autoSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function() {
    var profile = collectAllData();
    chrome.storage.local.set({ profile: profile }, function() {
      var status = document.getElementById('saveStatus');
      status.textContent = '✅ 자동 저장됨';
      status.className = 'status success';
      setTimeout(function() { status.className = 'status'; }, 1500);
    });
  }, 500);
}

// Listen for input changes on the entire profile tab
document.getElementById('tab-profile').addEventListener('input', autoSave);
document.getElementById('tab-profile').addEventListener('change', autoSave);

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
var GEMINI_API_KEY = '';

// Load API key from local storage
chrome.storage.local.get('apiKey', function(data) {
  if (data.apiKey) {
    GEMINI_API_KEY = data.apiKey;
    var keyInput = document.getElementById('apiKeyInput');
    if (keyInput) keyInput.value = '••••' + data.apiKey.slice(-8);
  }
});

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

  if (!GEMINI_API_KEY) {
    console.log('No API key set');
    return Promise.resolve(null);
  }

  var apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY;
  var apiBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
  });

  function callGemini(retries) {
    return fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: apiBody
    })
    .then(function(res) {
      if (res.status === 429 && retries > 0) {
        console.log('Gemini 429, retrying in 10s... (' + retries + ' left)');
        return new Promise(function(resolve) {
          setTimeout(function() { resolve(callGemini(retries - 1)); }, 10000);
        });
      }
      return res.json();
    });
  }

  return callGemini(2)
  .then(function(data) {
    try {
      var responseText = data.candidates[0].content.parts[0].text;
      console.log('Gemini response:', responseText.substring(0, 300));
      var parsed = JSON.parse(responseText);
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

          // 원문 텍스트 저장 (디버그용)
          var rawDiv = document.getElementById('rawText');
          if (rawDiv) rawDiv.textContent = allText.substring(0, 1000);

          // AI 파싱 시도
          parseWithGemini(allText).then(function(aiResult) {
            var profile, displayResult;
            if (aiResult) {
              profile = geminiToProfile(aiResult);
              displayResult = profile;
              displayResult._source = 'Gemini AI';
              console.log('AI parsed:', aiResult);
            } else {
              profile = parseResumeText(allText);
              displayResult = profile;
              displayResult._source = '로컬 파싱 (AI 실패)';
              console.log('Fallback local parse:', profile);
            }
            fillProfileFields(profile);
            showParsing(false);
            var count = Object.keys(profile).filter(function(k) {
              return profile[k] && !k.startsWith('_');
            }).length;
            showUploadSuccess(count, displayResult);

            // 자동 저장
            var saveProfile = collectAllData();
            chrome.storage.local.set({ profile: saveProfile }, function() {
              console.log('Profile auto-saved after PDF parse');
            });
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

  // 전처리: 숫자 사이 공백 제거 ("2 0 14" → "2014")
  for (var pass = 0; pass < 4; pass++) {
    text = text.replace(/(\d)\s+(\d)/g, '$1$2');
  }
  // 숫자와 점 사이 공백 제거 ("2014 .03" → "2014.03")
  text = text.replace(/(\d)\s+\./g, '$1.');
  text = text.replace(/\.\s+(\d)/g, '.$1');

  // 한글 단어 내 공백 정리 (PDF 추출 시 깨지는 패턴)
  text = text.replace(/대\s+학\s*교/g, '대학교');
  text = text.replace(/고\s*등\s*학\s*교/g, '고등학교');
  text = text.replace(/학\s+과/g, '학과');
  text = text.replace(/학\s+부/g, '학부');
  text = text.replace(/재\s*직\s*중/g, '재직중');
  text = text.replace(/만\s*기\s*전\s*역/g, '만기전역');
  text = text.replace(/학\s*점\s*은\s*행\s*제/g, '학점은행제');
  text = text.replace(/생\s*년\s*월\s*일/g, '생년월일');
  text = text.replace(/연\s*락\s*처/g, '연락처');
  text = text.replace(/인\s*적\s*사\s*항/g, '인적사항');
  text = text.replace(/학\s*력\s*사\s*항/g, '학력사항');
  text = text.replace(/경\s*력\s*사\s*항/g, '경력사항');
  text = text.replace(/자\s*격\s*사\s*항/g, '자격사항');
  text = text.replace(/병\s*역\s*사\s*항/g, '병역사항');
  text = text.replace(/해\s*병/g, '해병');

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
  // 시/도로 시작해서 숫자(번지/호수)가 나올때까지. "연" "학" 등이 나오면 중단
  var addrMatch = flatText.match(/((?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣0-9\s\-\(\),\.·]*\d+[\-\s]*\d*)/);
  if (addrMatch) {
    // "연 락" 이나 "학력" 등이 포함되면 그 앞까지만 자르기
    var addr = addrMatch[1].replace(/\s*(연\s*락|학력|핵심|경력|자격|병역|교육|보유)[\s\S]*$/, '').trim();
    result.address = addr;
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

  // === 학력 (다중) — "학력사항" 섹션에서만 파싱 ===
  result._allEducation = [];
  var eduSections = flatText.split(/학력사항/);
  var eduText = eduSections.length > 1 ? eduSections[1] : flatText;
  eduText = eduText.split(/핵심역량|경력사항|자격사항|기타사항/)[0];
  var eduRegex = /(\d{4}\.\d{2})\s*~\s*(\d{4}\.\d{2})\s+(.*?)\s+졸업/g;
  var eduM;
  while ((eduM = eduRegex.exec(eduText)) !== null) {
    var eduText = eduM[3].trim();
    // "수원 대학교 정보미디어학과" → school + major 분리
    var schoolMatch = eduText.match(/(.*?(?:대학교|고등학교|학점은행제))\s*(.*)/);
    var edu = {
      start: eduM[1].replace('.', '-'),
      end: eduM[2].replace('.', '-'),
      school: schoolMatch ? schoolMatch[1].trim() : eduText,
      major: schoolMatch && schoolMatch[2] ? schoolMatch[2].replace(/\(.*\)/, '').trim() : ''
    };
    if (/대학교/.test(edu.school)) edu.degree = '대학교';
    else if (/고등학교/.test(edu.school)) edu.degree = '고등학교';
    else if (/학점은행제/.test(edu.school)) edu.degree = '대학교';
    else edu.degree = '';
    result._allEducation.push(edu);
  }
  if (result._allEducation.length > 0) {
    result.school = result._allEducation[0].school;
    result.major = result._allEducation[0].major;
    result.schoolStart = result._allEducation[0].start;
    result.schoolEnd = result._allEducation[0].end;
  }

  // 학점
  var gpaMatch = flatText.match(/(\d\.\d{1,2})\s*[\/\|]\s*(\d\.\d{1,2})/);
  if (gpaMatch) result.gpa = gpaMatch[0].replace('|', '/');

  // === 경력 (다중) — "경력사항" 이후 텍스트에서만 파싱 ===
  result._allCareers = [];
  var careerSections = flatText.split(/경력사항/);
  var careerText = careerSections.length > 1 ? careerSections[1] : '';
  careerText = careerText.split(/자격사항|기타사항|보유스킬|교육사항|병역사항/)[0];
  var careerRegex = /(\d{4}\.\d{2})\s*~\s*(재직중|현재|\d{4}\.\d{2})\s+(.*?)\s*\/\s*(.*?)\s*\/\s*(\S+)/g;
  var carM;
  while ((carM = careerRegex.exec(careerText)) !== null) {
    result._allCareers.push({
      start: carM[1].replace('.', '-'),
      end: carM[2] === '재직중' || carM[2] === '현재' ? '재직중' : carM[2].replace('.', '-'),
      company: carM[3].replace(/^[㈜\(주\)]/, '').trim(),
      department: carM[4].trim(),
      position: carM[5].trim()
    });
  }
  if (result._allCareers.length > 0) {
    result.company = result._allCareers[0].company;
    result.position = result._allCareers[0].position;
    result.workStart = result._allCareers[0].start;
    result.workEnd = result._allCareers[0].end;
  }

  // === 자격증 (다중) — "자격사항" 또는 "기타사항" 섹션에서 파싱 ===
  result._allCerts = [];
  var certSections = flatText.split(/자격사항|기타사항/);
  var certText = certSections.length > 1 ? certSections[certSections.length - 1] : flatText;
  certText = certText.split(/교육사항|병역사항/)[0];
  // 자격증 이름 + 급수 + 연도 패턴
  var certRegex = /([가-힣a-zA-Z]+(?:기사|관리사|자격|기술자격|능력검정|회계사|세무사|중개사|복지사)[가-힣]*)\s*(\d*급?)\s*(?:\(\d{4}\))?/g;
  var certM;
  while ((certM = certRegex.exec(certText)) !== null) {
    var certName = certM[1].trim() + (certM[2] ? ' ' + certM[2] : '');
    if (!result._allCerts.includes(certName.trim())) {
      result._allCerts.push(certName.trim());
    }
  }
  if (result._allCerts.length > 0) {
    result.certs = result._allCerts.join(', ');
  }

  // === 경력별 주요 업무 추출 ===
  // "상세경력사항" 이후에서 각 경력의 프로젝트 제목 추출
  var detailSections = flatText.split(/상세경력사항/);
  if (detailSections.length > 1 && result._allCareers.length > 0) {
    var detailText = detailSections[1];
    result._allCareers.forEach(function(career) {
      // 해당 기간으로 시작하는 섹션 찾기
      var startDate = career.start.replace('-', '.');
      var idx = detailText.indexOf(startDate);
      if (idx >= 0) {
        var section = detailText.substring(idx);
        // 다음 경력 시작 전까지 잘라내기
        var nextCareer = section.match(/\n\d{4}\.\d{2}\s*~/);
        if (nextCareer) section = section.substring(0, nextCareer.index);
        // 프로젝트 제목 추출 (숫자. 제목 패턴)
        var projects = [];
        var projRegex = /\d+\.\s*([^\n✓▸\[]{3,50})/g;
        var projM;
        while ((projM = projRegex.exec(section)) !== null) {
          var title = projM[1].trim();
          if (!/주요\s*업무|성과/.test(title)) {
            projects.push(title);
          }
        }
        if (projects.length > 0) {
          career.description = projects.join(', ');
        }
      }
    });
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
  else if (result.military && result.military.startsWith('done')) result.gender = 'male'; // 군복무 → 남성
  else if (/여성|female/i.test(flatText)) result.gender = 'female';

  return result;
}

// Fill profile form fields with parsed data
function fillProfileFields(profile) {
  var filled = 0;

  // Basic fields
  BASIC_FIELDS.forEach(function(field) {
    var el = document.getElementById(field);
    if (el && profile[field]) {
      el.value = profile[field];
      el.style.transition = 'background-color 0.3s';
      el.style.backgroundColor = '#e8f5e9';
      filled++;
      setTimeout(function() { el.style.backgroundColor = ''; }, 5000);
    }
  });

  // Education
  var edus = profile._allEducation || profile.education || [];
  if (edus.length > 0) {
    document.getElementById('educationList').innerHTML = '';
    eduCount = 0;
    edus.forEach(function(edu) { addEducation(edu); });
    filled += edus.length;
  }

  // Careers
  var careers = profile._allCareers || profile.careers || [];
  if (careers.length > 0) {
    document.getElementById('careerList').innerHTML = '';
    careerCount = 0;
    careers.forEach(function(c) { addCareer(c); });
    filled += careers.length;
  }

  // Certificates
  var certs = profile._allCerts || profile.certificates || [];
  if (certs.length > 0) {
    document.getElementById('certList').innerHTML = '';
    certCount = 0;
    certs.forEach(function(c) { addCert(c); });
    filled += certs.length;
  }

  return filled;
}
