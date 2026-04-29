// Field mapping: Korean label keywords → profile field keys
var FIELD_MAP = [
  // 이름
  { keywords: ['이름', '성명', 'name', '지원자명', '성함', '성명 *'], field: 'name' },
  { keywords: ['영문 이름', '영문이름', 'english first', 'first name', '영문 성명(영문 이름)'], field: 'nameEnFirst' },
  { keywords: ['영문 성', 'english last', 'last name', '영문 성명(영문 성)'], field: 'nameEnLast' },
  // 연락처
  { keywords: ['이메일', 'email', 'e-mail', '메일'], field: 'email' },
  { keywords: ['연락처', '전화', '핸드폰', '휴대폰', '휴대전화', 'phone', 'mobile', 'tel', '번호', '휴대폰 번호'], field: 'phone' },
  // 주소
  { keywords: ['주소', 'address', '거주지', '현주소'], field: 'address' },
  // 생년월일
  { keywords: ['생년월일', '생년', 'birth', '출생', '생일'], field: 'birth' },
  // 학력
  { keywords: ['학교', '대학', '출신학교', 'school', 'university', '학교명'], field: 'school' },
  { keywords: ['전공', 'major', '학과'], field: 'major' },
  { keywords: ['학점', 'gpa', '평점', '성적'], field: 'gpa' },
  { keywords: ['입학', '입학일', '입학년'], field: 'schoolStart' },
  { keywords: ['졸업', '졸업일', '졸업년', '졸업예정'], field: 'schoolEnd' },
  // 경력
  { keywords: ['회사', '직장', '근무처', 'company', '회사명', '기업명'], field: 'company' },
  { keywords: ['직무', '직책', '직위', 'position', '포지션', '담당', '역할'], field: 'position' },
  { keywords: ['입사', '입사일', '근무시작'], field: 'workStart' },
  { keywords: ['퇴사', '퇴사일', '근무종료'], field: 'workEnd' },
  { keywords: ['업무내용', '담당업무', '주요업무', '업무 내용', '직무내용'], field: 'workDesc' },
  // 자격/어학/병역
  { keywords: ['자격증', '자격', 'certification', 'certificate', '면허'], field: 'certs' },
  { keywords: ['어학', '외국어', '영어', '토익', 'toeic', 'toefl', '토플', '어학시험'], field: 'langTest' },
  { keywords: ['점수', 'score', '등급'], field: 'langScore' },
  { keywords: ['병역', '군복무', '군필', '군대', 'military', '복무'], field: 'military' },
  // 연봉
  { keywords: ['희망연봉', '희망 연봉', '희망급여', 'desired salary'], field: 'salaryDesired' },
  { keywords: ['직전연봉', '직전 연봉', '현재연봉', '전직연봉', 'previous salary', 'current salary'], field: 'salaryPrev' },
  // 보훈/장애
  { keywords: ['보훈', '국가유공'], field: 'veteran' },
  { keywords: ['장애', '장애정보', '장애인', 'disability'], field: 'disability' }
];

// Find the label text for an input element — checks multiple sources
function getLabelText(input) {
  var texts = [];

  // 1. placeholder (SK Careers 스타일: placeholder가 라벨)
  if (input.placeholder) texts.push(input.placeholder);

  // 2. <label for="id">
  if (input.id) {
    var label = document.querySelector('label[for="' + CSS.escape(input.id) + '"]');
    if (label) texts.push(label.textContent.trim());
  }

  // 3. Parent <label>
  var parentLabel = input.closest('label');
  if (parentLabel) texts.push(parentLabel.textContent.trim());

  // 4. name attribute
  if (input.name) texts.push(input.name);

  // 5. aria-label
  if (input.getAttribute('aria-label')) texts.push(input.getAttribute('aria-label'));

  // 6. Preceding sibling
  var prev = input.previousElementSibling;
  if (prev && prev.textContent) texts.push(prev.textContent.trim());

  // 7. Parent's previous sibling (table/div forms)
  var parent = input.parentElement;
  if (parent) {
    var prevSib = parent.previousElementSibling;
    if (prevSib && prevSib.textContent) texts.push(prevSib.textContent.trim());
  }

  // 8. Grandparent th/label (table-based forms)
  var grandparent = parent ? parent.parentElement : null;
  if (grandparent) {
    var th = grandparent.querySelector('th, .label, .title, [class*="label"], [class*="title"]');
    if (th) texts.push(th.textContent.trim());
  }

  // 9. Nearby text in parent chain (up to 3 levels)
  var el = input;
  for (var i = 0; i < 3; i++) {
    el = el.parentElement;
    if (!el) break;
    var labelEl = el.querySelector('label, .label, [class*="label"], [class*="title"], h3, h4, dt');
    if (labelEl && labelEl.textContent.length < 50) {
      texts.push(labelEl.textContent.trim());
    }
  }

  // 10. data attributes
  if (input.dataset.label) texts.push(input.dataset.label);
  if (input.dataset.placeholder) texts.push(input.dataset.placeholder);

  return texts.join(' ').toLowerCase();
}

// Match a label text to a profile field
function matchField(labelText) {
  for (var i = 0; i < FIELD_MAP.length; i++) {
    var map = FIELD_MAP[i];
    for (var j = 0; j < map.keywords.length; j++) {
      if (labelText.includes(map.keywords[j].toLowerCase())) {
        return map.field;
      }
    }
  }
  return null;
}

// Get all fillable inputs on the page
function getInputs() {
  return Array.from(document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], ' +
    'input[type="date"], input[type="url"], input:not([type]), ' +
    'textarea, select'
  )).filter(function(el) {
    var rect = el.getBoundingClientRect();
    return !el.disabled && !el.readOnly && rect.width > 0 && rect.height > 0 &&
           el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button' &&
           el.type !== 'password' && el.type !== 'search' && el.type !== 'file' &&
           el.type !== 'checkbox' && el.type !== 'radio';
  });
}

// Get all clickable button-style inputs (비대상/대상 등)
function getButtonInputs() {
  return Array.from(document.querySelectorAll(
    'button, [role="button"], [role="radio"], [role="option"], ' +
    'input[type="radio"], input[type="checkbox"], ' +
    '[class*="btn"], [class*="button"], [class*="chip"], [class*="toggle"], [class*="option"]'
  )).filter(function(el) {
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

// Set value and trigger change events (React/Vue/Angular compatible)
function setValue(input, value) {
  if (!value) return false;

  // Handle select elements
  if (input.tagName === 'SELECT') {
    var options = Array.from(input.options);
    var match = options.find(function(opt) {
      var optText = opt.text.toLowerCase();
      var optVal = opt.value.toLowerCase();
      var val = value.toLowerCase();
      return optText.includes(val) || optVal.includes(val) || val.includes(optText);
    });
    if (match) {
      input.value = match.value;
    } else {
      return false;
    }
  } else {
    // For React/Vue sites — use native setter to trigger state updates
    var nativeInputSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    );
    var nativeTextareaSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    );

    if (input.tagName === 'TEXTAREA' && nativeTextareaSetter) {
      nativeTextareaSetter.set.call(input, value);
    } else if (nativeInputSetter) {
      nativeInputSetter.set.call(input, value);
    } else {
      input.value = value;
    }
  }

  // Trigger all common events for framework compatibility
  ['input', 'change', 'blur', 'keyup', 'keydown'].forEach(function(evtName) {
    input.dispatchEvent(new Event(evtName, { bubbles: true }));
  });
  // React specific
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

  return true;
}

// Handle button-style selections (보훈/병역/장애 → 비대상/대상)
function handleButtonSelections(profile) {
  var filled = 0;
  var buttons = getButtonInputs();

  // Map profile values to button text
  var buttonMappings = [
    { sectionKeyword: '보훈', value: profile.veteran === 'yes' ? '대상' : '비대상' },
    { sectionKeyword: '병역', value: profile.military === 'exempt' || profile.military === 'na' ? '비대상' : '대상' },
    { sectionKeyword: '장애', value: profile.disability === 'yes' ? '대상' : '비대상' }
  ];

  buttonMappings.forEach(function(mapping) {
    // Find section containing the keyword
    var allElements = document.querySelectorAll('*');
    allElements.forEach(function(el) {
      if (el.children.length > 0) return; // Only leaf text nodes
      if (el.textContent.trim() === mapping.sectionKeyword ||
          el.textContent.trim().includes(mapping.sectionKeyword + ' 정보') ||
          el.textContent.trim().includes(mapping.sectionKeyword + ' 사항')) {
        // Find nearby buttons
        var parent = el.parentElement;
        for (var i = 0; i < 3; i++) {
          if (!parent) break;
          var btns = parent.querySelectorAll('button, [role="button"], [role="radio"], [class*="btn"], [class*="option"], [class*="chip"]');
          btns.forEach(function(btn) {
            if (btn.textContent.trim() === mapping.value) {
              btn.click();
              filled++;
            }
          });
          if (btns.length > 0) break;
          parent = parent.parentElement;
        }
      }
    });
  });

  return filled;
}

// Highlight filled field with animation
function highlightField(input) {
  input.style.transition = 'all 0.3s';
  input.style.backgroundColor = '#e8f5e9';
  input.style.borderColor = '#66bb6a';
  input.style.boxShadow = '0 0 0 2px rgba(102, 187, 106, 0.3)';
  setTimeout(function() {
    input.style.backgroundColor = '';
    input.style.borderColor = '';
    input.style.boxShadow = '';
  }, 4000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'detectFields') {
    var inputs = getInputs();
    var buttons = getButtonInputs();
    sendResponse({ count: inputs.length, buttons: buttons.length });
  }

  if (request.action === 'fillForm') {
    var inputs = getInputs();
    var profile = request.profile;
    var filled = 0;
    var matched = {};

    // Pass 1: Fill text inputs and selects
    inputs.forEach(function(input) {
      var labelText = getLabelText(input);
      if (!labelText) return;

      var fieldKey = matchField(labelText);

      // Avoid duplicate fills
      if (fieldKey && profile[fieldKey] && !matched[fieldKey]) {
        var success = setValue(input, profile[fieldKey]);
        if (success) {
          highlightField(input);
          matched[fieldKey] = true;
          filled++;
        }
      }
    });

    // Pass 2: Handle button-style selections (보훈/병역/장애)
    try {
      filled += handleButtonSelections(profile);
    } catch(e) {
      console.log('Button selection error:', e);
    }

    console.log('Fillme: filled ' + filled + ' fields', matched);
    sendResponse({ filled: filled });
  }

  return true;
});
