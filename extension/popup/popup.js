// ===== Resume File Upload & Parsing =====

// PDF.js worker setup
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
}

// Upload zone events
var uploadZone = document.getElementById('uploadZone');
var fileInput = document.getElementById('fileInput');

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
  var reader = new FileReader();
  reader.onload = function() {
    var typedArray = new Uint8Array(reader.result);
    pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
      var allText = '';
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) {
        pages.push(pdf.getPage(i).then(function(page) {
          return page.getTextContent().then(function(content) {
            return content.items.map(function(item) { return item.str; }).join(' ');
          });
        }));
      }
      Promise.all(pages).then(function(texts) {
        allText = texts.join('\n');
        var parsed = parseResumeText(allText);
        fillProfileFields(parsed);
        showParsing(false);
        showUploadSuccess();
      });
    }).catch(function(err) {
      showParsing(false);
      alert('PDF 파싱 중 오류가 발생했습니다: ' + err.message);
    });
  };
  reader.readAsArrayBuffer(file);
}

function showParsing(show) {
  document.getElementById('parsingStatus').style.display = show ? 'block' : 'none';
  document.getElementById('uploadZone').style.display = show ? 'none' : 'block';
}

function showUploadSuccess() {
  var zone = document.getElementById('uploadZone');
  zone.innerHTML = '<div class="icon">✅</div><div class="text"><strong>이력서 분석 완료!</strong><br>아래에서 확인하고 수정하세요</div>';
  zone.style.borderColor = '#66bb6a';
  zone.style.background = '#e8f5e9';
}

// Parse resume text into structured fields using patterns
function parseResumeText(text) {
  var result = {};
  var lines = text.split(/[\n\r]+/).map(function(l) { return l.trim(); }).filter(Boolean);
  var fullText = text.replace(/\s+/g, ' ');

  // 이름 - usually first prominent text or near "성명/이름"
  var nameMatch = fullText.match(/(?:성명|이름)\s*[:\-]?\s*([가-힣]{2,4})/);
  if (nameMatch) result.name = nameMatch[1];

  // 영문 이름
  var enNameMatch = fullText.match(/(?:영문|english|영문명|영문이름)\s*[:\-]?\s*([A-Za-z\s\-]+)/i);
  if (enNameMatch) result.nameEn = enNameMatch[1].trim();

  // 이메일
  var emailMatch = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  // 전화번호
  var phoneMatch = fullText.match(/01[0-9][\-\s]?\d{3,4}[\-\s]?\d{4}/);
  if (phoneMatch) result.phone = phoneMatch[0].replace(/\s/g, '');

  // 주소
  var addrMatch = fullText.match(/(?:주소|거주지|현주소)\s*[:\-]?\s*([^\n,]{5,50})/);
  if (addrMatch) result.address = addrMatch[1].trim();

  // 생년월일
  var birthMatch = fullText.match(/(?:생년월일|생년|출생)\s*[:\-]?\s*(\d{4}[\.\-\/]\s?\d{1,2}[\.\-\/]\s?\d{1,2})/);
  if (birthMatch) result.birth = birthMatch[1].replace(/[\.\s\/]/g, '-');
  if (!birthMatch) {
    birthMatch = fullText.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (birthMatch) result.birth = birthMatch[1] + '-' + birthMatch[2].padStart(2,'0') + '-' + birthMatch[3].padStart(2,'0');
  }

  // 학교
  var schoolMatch = fullText.match(/([가-힣]+(?:대학교|대학|고등학교))/);
  if (schoolMatch) result.school = schoolMatch[1];

  // 전공
  var majorMatch = fullText.match(/([가-힣]+(?:학과|학부|전공|공학|학))\b/);
  if (majorMatch) result.major = majorMatch[1];

  // 학점
  var gpaMatch = fullText.match(/(\d\.\d{1,2})\s*\/\s*(\d\.\d{1,2})/);
  if (gpaMatch) result.gpa = gpaMatch[0];

  // 졸업년도 - look for year patterns near school
  var gradMatch = fullText.match(/(\d{4})\s*[\.\/\-]\s*(\d{1,2})\s*(?:졸업|졸)/);
  if (gradMatch) result.schoolEnd = gradMatch[1] + '-' + gradMatch[2].padStart(2,'0');

  // 회사명
  var companyMatch = fullText.match(/(?:회사|직장|근무처|경력)\s*[:\-]?\s*(?:주식회사|㈜|\(주\))?\s*([가-힣a-zA-Z\s]{2,20})/);
  if (companyMatch) result.company = companyMatch[1].trim();

  // 직무/직책
  var posMatch = fullText.match(/(?:직무|직책|직위|포지션|담당)\s*[:\-]?\s*([가-힣a-zA-Z\s]{2,20})/);
  if (posMatch) result.position = posMatch[1].trim();

  // 자격증
  var certMatch = fullText.match(/(?:자격증|자격|면허)\s*[:\-]?\s*([^\n]{3,50})/);
  if (certMatch) result.certs = certMatch[1].trim();

  // 어학 - TOEIC, TOEFL, etc.
  var langMatch = fullText.match(/(TOEIC|TOEFL|OPIC|TEPS|토익|토플|오픽|텝스)/i);
  if (langMatch) result.langTest = langMatch[1].toUpperCase();

  var scoreMatch = fullText.match(/(?:TOEIC|TOEFL|OPIC|TEPS|토익|토플|오픽|텝스)\s*[:\-]?\s*(\d{2,3}점?|[A-Z]{1,3}\d?|Level\s?\d)/i);
  if (scoreMatch) result.langScore = scoreMatch[1].replace('점','');

  // 병역
  if (/군필|만기전역|병장|상병|일병/.test(fullText)) {
    if (/해군/.test(fullText)) result.military = 'done_navy';
    else if (/공군/.test(fullText)) result.military = 'done_air';
    else if (/해병/.test(fullText)) result.military = 'done_marine';
    else result.military = 'done';
  } else if (/면제|비대상/.test(fullText)) {
    result.military = 'exempt';
  }

  return result;
}

// Fill profile form fields with parsed data
function fillProfileFields(parsed) {
  PROFILE_FIELDS.forEach(function(field) {
    var el = document.getElementById(field);
    if (el && parsed[field]) {
      el.value = parsed[field];
      el.style.backgroundColor = '#e8f5e9';
      setTimeout(function() { el.style.backgroundColor = ''; }, 3000);
    }
  });
}

// ===== Original Code Below =====

// Profile fields to save/load
const PROFILE_FIELDS = [
  'name', 'nameEn', 'email', 'phone', 'address', 'birth', 'gender',
  'school', 'major', 'gpa', 'schoolStart', 'schoolEnd', 'degree',
  'company', 'position', 'workStart', 'workEnd', 'workDesc',
  'certs', 'langTest', 'langScore', 'military'
];

// Tab switching
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// Load saved profile
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

// Save profile
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
    setTimeout(function() { status.className = 'status'; }, 2000);
  });
});

// Detect fields on current page
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  chrome.tabs.sendMessage(tabs[0].id, { action: 'detectFields' }, function(response) {
    if (response && response.count) {
      document.getElementById('fieldCount').textContent = response.count;
    } else {
      document.getElementById('fieldCount').textContent = '0';
    }
  });
});

// Auto-fill button
document.getElementById('btnFill').addEventListener('click', function() {
  chrome.storage.local.get('profile', function(data) {
    if (!data.profile || !data.profile.name) {
      var status = document.getElementById('fillStatus');
      status.textContent = '⚠️ 먼저 "내 이력서" 탭에서 정보를 입력해주세요.';
      status.className = 'status error';
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'fillForm',
        profile: data.profile
      }, function(response) {
        var status = document.getElementById('fillStatus');
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
