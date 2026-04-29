// Field mapping: Korean label keywords → profile field keys
const FIELD_MAP = [
  // 이름
  { keywords: ['이름', '성명', 'name', '지원자명', '성함'], field: 'name' },
  { keywords: ['영문', 'english name', '영문명', '영문이름'], field: 'nameEn' },
  // 연락처
  { keywords: ['이메일', 'email', 'e-mail', '메일'], field: 'email' },
  { keywords: ['연락처', '전화', '핸드폰', '휴대폰', '휴대전화', 'phone', 'mobile', 'tel', '번호'], field: 'phone' },
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
  { keywords: ['점수', 'score', '성적', '등급'], field: 'langScore' },
  { keywords: ['병역', '군복무', '군필', '군대', 'military', '복무'], field: 'military' }
];

// Find the label text for an input element
function getLabelText(input) {
  var texts = [];

  // 1. Check <label> element
  if (input.id) {
    var label = document.querySelector('label[for="' + input.id + '"]');
    if (label) texts.push(label.textContent.trim());
  }

  // 2. Check parent label
  var parentLabel = input.closest('label');
  if (parentLabel) texts.push(parentLabel.textContent.trim());

  // 3. Check placeholder
  if (input.placeholder) texts.push(input.placeholder);

  // 4. Check name attribute
  if (input.name) texts.push(input.name);

  // 5. Check aria-label
  if (input.getAttribute('aria-label')) texts.push(input.getAttribute('aria-label'));

  // 6. Check preceding sibling text / nearby text
  var prev = input.previousElementSibling;
  if (prev) texts.push(prev.textContent.trim());

  // 7. Check parent's text content (for table-based forms)
  var parent = input.parentElement;
  if (parent) {
    var prevTd = parent.previousElementSibling;
    if (prevTd) texts.push(prevTd.textContent.trim());
  }

  // 8. Check grandparent (common in Korean career sites)
  var grandparent = parent ? parent.parentElement : null;
  if (grandparent) {
    var th = grandparent.querySelector('th, .label, .title');
    if (th) texts.push(th.textContent.trim());
  }

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
    // Filter out hidden, disabled, or tiny inputs
    var rect = el.getBoundingClientRect();
    return !el.disabled && !el.readOnly && rect.width > 0 && rect.height > 0 &&
           el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button' &&
           el.type !== 'password' && el.type !== 'search';
  });
}

// Set value and trigger change events
function setValue(input, value) {
  if (!value) return false;

  // Handle select elements
  if (input.tagName === 'SELECT') {
    var options = Array.from(input.options);
    var match = options.find(function(opt) {
      return opt.text.includes(value) || opt.value.includes(value);
    });
    if (match) {
      input.value = match.value;
    } else {
      return false;
    }
  } else {
    // For React/Vue sites, need to use native input setter
    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    );
    var nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    );

    if (input.tagName === 'TEXTAREA' && nativeTextareaValueSetter) {
      nativeTextareaValueSetter.set.call(input, value);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.set.call(input, value);
    } else {
      input.value = value;
    }
  }

  // Trigger events for React/Vue/Angular
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));

  return true;
}

// Highlight filled field
function highlightField(input) {
  input.style.transition = 'all 0.3s';
  input.style.backgroundColor = '#e8f5e9';
  input.style.borderColor = '#66bb6a';
  setTimeout(function() {
    input.style.backgroundColor = '';
    input.style.borderColor = '';
  }, 3000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'detectFields') {
    var inputs = getInputs();
    sendResponse({ count: inputs.length });
  }

  if (request.action === 'fillForm') {
    var inputs = getInputs();
    var profile = request.profile;
    var filled = 0;

    inputs.forEach(function(input) {
      var labelText = getLabelText(input);
      var fieldKey = matchField(labelText);

      if (fieldKey && profile[fieldKey]) {
        var success = setValue(input, profile[fieldKey]);
        if (success) {
          highlightField(input);
          filled++;
        }
      }
    });

    sendResponse({ filled: filled });
  }

  return true;
});
