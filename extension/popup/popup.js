// Profile fields to save/load
var PROFILE_FIELDS = [
  'name', 'nameEn', 'email', 'phone', 'address', 'birth', 'gender',
  'school', 'major', 'gpa', 'schoolStart', 'schoolEnd', 'degree',
  'company', 'position', 'workStart', 'workEnd', 'workDesc',
  'certs', 'langTest', 'langScore', 'military'
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
          console.log('Extracted text:', allText);
          var parsed = parseResumeText(allText);
          console.log('Parsed result:', parsed);
          fillProfileFields(parsed);
          showParsing(false);
          showUploadSuccess(Object.keys(parsed).length);
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

function showUploadSuccess(count) {
  var zone = document.getElementById('uploadZone');
  if (zone) {
    zone.innerHTML = '<div class="icon">✅</div><div class="text"><strong>' + (count || 0) + '개 항목 분석 완료!</strong><br>아래에서 확인하고 저장하세요</div>';
    zone.style.borderColor = '#66bb6a';
    zone.style.background = '#e8f5e9';
    zone.style.cursor = 'default';
  }
}

// Parse resume text into structured fields
function parseResumeText(text) {
  var result = {};
  var fullText = text.replace(/\s+/g, ' ');

  // 이메일 (가장 확실한 패턴)
  var emailMatch = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  // 전화번호
  var phoneMatch = fullText.match(/01[0-9][\-\s\.]*\d{3,4}[\-\s\.]*\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0].replace(/[\s\.]/g, '').replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');

  // 이름 - "성명: 홍길동" 또는 "이름: 홍길동" 패턴
  var nameMatch = fullText.match(/(?:성명|이름|지원자|성 명)\s*[:\-\|]?\s*([가-힣]{2,4})/);
  if (nameMatch) result.name = nameMatch[1];

  // 영문 이름
  var enNameMatch = fullText.match(/(?:영문|english|영문명|영문이름|영문 성명)\s*[:\-\|]?\s*([A-Za-z][\sA-Za-z\-]{2,30})/i);
  if (enNameMatch) result.nameEn = enNameMatch[1].trim();

  // 주소
  var addrMatch = fullText.match(/(?:주소|거주지|현주소|자택)\s*[:\-\|]?\s*([가-힣0-9\s\-\(\)]{5,50})/);
  if (addrMatch) result.address = addrMatch[1].trim();
  if (!addrMatch) {
    // 시/도로 시작하는 주소 패턴
    addrMatch = fullText.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣0-9\s\-\(\)]{5,40}/);
    if (addrMatch) result.address = addrMatch[0].trim();
  }

  // 생년월일
  var birthMatch = fullText.match(/(?:생년월일|생년|출생|생일)\s*[:\-\|]?\s*(\d{4}[\.\-\/\s]\s?\d{1,2}[\.\-\/\s]\s?\d{1,2})/);
  if (birthMatch) result.birth = birthMatch[1].replace(/[\.\s\/]/g, '-').replace(/--/g, '-');
  if (!birthMatch) {
    birthMatch = fullText.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (birthMatch) result.birth = birthMatch[1] + '-' + birthMatch[2].padStart(2,'0') + '-' + birthMatch[3].padStart(2,'0');
  }

  // 학교
  var schoolMatch = fullText.match(/([가-힣]+(?:대학교|대학|고등학교))/);
  if (schoolMatch) result.school = schoolMatch[1];

  // 전공
  var majorMatch = fullText.match(/([가-힣]+(?:학과|학부|공학과|공학부))/);
  if (majorMatch) result.major = majorMatch[1];
  if (!majorMatch) {
    majorMatch = fullText.match(/(?:전공|학과)\s*[:\-\|]?\s*([가-힣]{2,15})/);
    if (majorMatch) result.major = majorMatch[1];
  }

  // 학점
  var gpaMatch = fullText.match(/(\d\.\d{1,2})\s*[\/\|]\s*(\d\.\d{1,2})/);
  if (gpaMatch) result.gpa = gpaMatch[0].replace('|', '/');

  // 졸업년도
  var gradMatch = fullText.match(/(\d{4})\s*[\.\-\/]\s*(\d{1,2})\s*(?:졸업|졸|수료)/);
  if (gradMatch) result.schoolEnd = gradMatch[1] + '-' + gradMatch[2].padStart(2,'0');

  // 입학년도
  var entrMatch = fullText.match(/(\d{4})\s*[\.\-\/]\s*(\d{1,2})\s*(?:입학|입)/);
  if (entrMatch) result.schoolStart = entrMatch[1] + '-' + entrMatch[2].padStart(2,'0');

  // 회사명
  var companyPatterns = [
    /(?:회사명?|직장|근무처|근무 회사)\s*[:\-\|]?\s*(?:주식회사|㈜|\(주\))?\s*([가-힣a-zA-Z\s]{2,20})/,
    /(?:주식회사|㈜|\(주\))\s*([가-힣a-zA-Z]{2,15})/
  ];
  for (var i = 0; i < companyPatterns.length; i++) {
    var cm = fullText.match(companyPatterns[i]);
    if (cm) { result.company = cm[1].trim(); break; }
  }

  // 직무/직책
  var posMatch = fullText.match(/(?:직무|직책|직위|포지션|담당업무)\s*[:\-\|]?\s*([가-힣a-zA-Z\s]{2,20})/);
  if (posMatch) result.position = posMatch[1].trim();

  // 자격증
  var certMatch = fullText.match(/(?:자격증|자격|면허|자격 사항)\s*[:\-\|]?\s*([^\n]{3,50})/);
  if (certMatch) result.certs = certMatch[1].trim();
  if (!certMatch) {
    // 유명 자격증 이름 직접 매칭
    var certNames = fullText.match(/(정보처리기사|컴퓨터활용능력|한국사능력검정|SQLD|ADsP|빅데이터분석기사|공인회계사|세무사|변호사|감정평가사|공인중개사|전기기사|건축기사|토목기사|사회복지사)/g);
    if (certNames) result.certs = certNames.join(', ');
  }

  // 어학
  var langMatch = fullText.match(/(TOEIC|TOEFL|OPIC|TEPS|토익|토플|오픽|텝스|IELTS|HSK|JLPT|JPT)/i);
  if (langMatch) {
    result.langTest = langMatch[1].toUpperCase()
      .replace('토익', 'TOEIC').replace('토플', 'TOEFL')
      .replace('오픽', 'OPIC').replace('텝스', 'TEPS');
  }

  var scoreMatch = fullText.match(/(?:TOEIC|TOEFL|OPIC|TEPS|토익|토플|오픽|텝스|IELTS|HSK|JLPT|JPT)\s*[:\-\|]?\s*(\d{2,4}점?|[A-Z]{1,3}\d?|Level\s?\d|N\d)/i);
  if (scoreMatch) result.langScore = scoreMatch[1].replace('점','');

  // 병역
  if (/군필|만기전역|병장|상병|일병|이병|전역/.test(fullText)) {
    if (/해군/.test(fullText)) result.military = 'done_navy';
    else if (/공군/.test(fullText)) result.military = 'done_air';
    else if (/해병/.test(fullText)) result.military = 'done_marine';
    else result.military = 'done';
  } else if (/면제|비대상|의병제/.test(fullText)) {
    result.military = 'exempt';
  }

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
