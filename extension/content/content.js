// Field mapping: label keywords → profile field keys
var FIELD_MAP = [
  // 이름 (가장 먼저 매칭되도록)
  { keywords: ['이름', '성명', 'name', '지원자명', '성함'], field: 'name', exclude: ['영문', 'english', '이메일'] },
  { keywords: ['영문 이름', '영문이름', 'english first', 'first name', '영문 성명(영문 이름)'], field: 'nameEnFirst' },
  { keywords: ['영문 성', 'english last', 'last name', '영문 성명(영문 성)'], field: 'nameEnLast' },
  // 연락처
  { keywords: ['이메일', 'email', 'e-mail', '메일'], field: 'email' },
  { keywords: ['연락처', '전화', '핸드폰', '휴대폰', '휴대전화', 'phone', 'mobile', 'tel'], field: 'phone' },
  // 주소
  { keywords: ['주소', 'address', '거주지', '현주소'], field: 'address' },
  // 생년월일
  { keywords: ['생년월일', '생년', 'birth', '출생', '생일'], field: 'birth' },
  // 학력
  { keywords: ['학교', '대학', '출신학교', 'school', 'university', '학교명'], field: 'school' },
  { keywords: ['전공', 'major', '학과'], field: 'major' },
  { keywords: ['학점', 'gpa', '평점'], field: 'gpa' },
  // 경력
  { keywords: ['회사', '직장', '근무처', 'company', '회사명'], field: 'company' },
  { keywords: ['직무', '직책', '직위', 'position', '포지션'], field: 'position' },
  // 자격/어학
  { keywords: ['자격증', '자격', 'certification'], field: 'certs' },
  { keywords: ['어학', '외국어', '토익', 'toeic'], field: 'langTest' },
  { keywords: ['점수', 'score'], field: 'langScore' },
  // 연봉
  { keywords: ['희망연봉', '희망 연봉'], field: 'salaryDesired' },
  { keywords: ['직전연봉', '직전 연봉', '현재연봉'], field: 'salaryPrev' },
  // 보훈/장애/병역
  { keywords: ['보훈', '국가유공'], field: 'veteran' },
  { keywords: ['장애', '장애여부', '장애정보'], field: 'disability' },
  { keywords: ['병역', '군복무', '군필', 'military'], field: 'military' },
  // URL
  { keywords: ['url', '홈페이지', 'github', 'linkedin', '블로그', 'blog', '유관 url'], field: 'url' }
];

// Get label text for an input — comprehensive search
function getLabelText(input) {
  var texts = [];

  // 1. placeholder
  if (input.placeholder) texts.push(input.placeholder);

  // 2. label[for]
  if (input.id) {
    try {
      var label = document.querySelector('label[for="' + CSS.escape(input.id) + '"]');
      if (label) texts.push(label.textContent.trim());
    } catch(e) {}
  }

  // 3. Parent label
  var parentLabel = input.closest('label');
  if (parentLabel) texts.push(parentLabel.textContent.trim());

  // 4. name / aria-label
  if (input.name) texts.push(input.name);
  if (input.getAttribute('aria-label')) texts.push(input.getAttribute('aria-label'));

  // 5. Walk up parent chain and look for label-like text
  var el = input;
  for (var i = 0; i < 5; i++) {
    el = el.parentElement;
    if (!el) break;

    // Direct text children of parent
    var children = el.childNodes;
    for (var j = 0; j < children.length; j++) {
      var child = children[j];
      // Text node
      if (child.nodeType === 3 && child.textContent.trim().length > 0 && child.textContent.trim().length < 30) {
        texts.push(child.textContent.trim());
      }
      // Element with short text (label, span, div, p, h1-h6)
      if (child.nodeType === 1 && child !== input && !child.contains(input)) {
        var tag = child.tagName.toLowerCase();
        var txt = child.textContent.trim();
        if (txt.length > 0 && txt.length < 40 &&
            (tag === 'label' || tag === 'span' || tag === 'div' || tag === 'p' ||
             tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'dt' || tag === 'th' ||
             child.className.match(/label|title|header|name/i))) {
          texts.push(txt);
        }
      }
    }

    // Also check previous sibling of parent
    var prevSib = el.previousElementSibling;
    if (prevSib && prevSib.textContent.trim().length < 40) {
      texts.push(prevSib.textContent.trim());
    }
  }

  return texts.join(' ').toLowerCase();
}

// Match a label text to a profile field
function matchField(labelText) {
  for (var i = 0; i < FIELD_MAP.length; i++) {
    var map = FIELD_MAP[i];
    // Check exclude keywords first
    if (map.exclude) {
      var excluded = false;
      for (var k = 0; k < map.exclude.length; k++) {
        if (labelText.includes(map.exclude[k].toLowerCase())) { excluded = true; break; }
      }
      if (excluded) continue;
    }
    for (var j = 0; j < map.keywords.length; j++) {
      if (labelText.includes(map.keywords[j].toLowerCase())) {
        return map.field;
      }
    }
  }
  return null;
}

// Get all fillable inputs
function getInputs() {
  return Array.from(document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], ' +
    'input[type="date"], input[type="url"], input:not([type]), ' +
    'textarea, select'
  )).filter(function(el) {
    var rect = el.getBoundingClientRect();
    var isVisible = rect.width > 0 && rect.height > 0;
    var isEditable = !el.disabled && !el.readOnly;
    var isNotSpecial = el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button' &&
                       el.type !== 'password' && el.type !== 'search' && el.type !== 'file' &&
                       el.type !== 'checkbox' && el.type !== 'radio';
    return isVisible && isEditable && isNotSpecial;
  });
}

// Set value — React/Vue/Angular compatible
function setValue(input, value) {
  if (!value) return false;

  if (input.tagName === 'SELECT') {
    var options = Array.from(input.options);
    // Try to find matching option
    var match = null;
    var val = value.toLowerCase();

    // 보훈/장애 → "비대상" 매핑
    if (val === 'no' || val === '비대상') {
      match = options.find(function(o) { return o.text.includes('비대상') || o.text.includes('해당없음') || o.value === 'N'; });
    } else if (val === 'yes' || val === '대상') {
      match = options.find(function(o) { return o.text.includes('대상') && !o.text.includes('비대상'); });
    }

    if (!match) {
      match = options.find(function(o) {
        return o.text.toLowerCase().includes(val) || o.value.toLowerCase().includes(val);
      });
    }

    if (match) {
      input.value = match.value;
    } else {
      return false;
    }
  } else {
    // Use native setter for React compatibility
    var setter = Object.getOwnPropertyDescriptor(
      input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    );
    if (setter && setter.set) {
      setter.set.call(input, value);
    } else {
      input.value = value;
    }
  }

  // Fire all events for framework compatibility
  input.dispatchEvent(new Event('focus', { bubbles: true }));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));

  // React 16+ specific
  var tracker = input._valueTracker;
  if (tracker) { tracker.setValue(''); }
  input.dispatchEvent(new Event('input', { bubbles: true }));

  return true;
}

// Highlight filled field
function highlightField(input) {
  var orig = input.style.cssText;
  input.style.transition = 'all 0.3s';
  input.style.backgroundColor = '#e8f5e9';
  input.style.borderColor = '#66bb6a';
  input.style.boxShadow = '0 0 0 2px rgba(102, 187, 106, 0.3)';
  setTimeout(function() { input.style.cssText = orig; }, 4000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'detectFields') {
    var inputs = getInputs();
    // Log detected fields for debugging
    inputs.forEach(function(inp) {
      var label = getLabelText(inp);
      var matched = matchField(label);
      console.log('Fillme detected:', inp.tagName, '|', label.substring(0, 50), '→', matched || '(no match)');
    });
    sendResponse({ count: inputs.length });
  }

  if (request.action === 'fillForm') {
    var inputs = getInputs();
    var profile = request.profile;
    var filled = 0;
    var matched = {};

    console.log('Fillme fillForm: found', inputs.length, 'inputs');
    console.log('Fillme profile keys:', Object.keys(profile).filter(function(k) { return profile[k]; }));

    inputs.forEach(function(input, idx) {
      var labelText = getLabelText(input);
      var fieldKey = matchField(labelText);
      console.log('Fillme [' + idx + ']:', input.tagName, input.type || '', '| label:', labelText.substring(0, 60), '→', fieldKey || 'NO MATCH', '| value in profile:', fieldKey ? (profile[fieldKey] ? 'YES' : 'NO') : '-');

      if (!labelText || !fieldKey) return;
      if (!profile[fieldKey] || matched[fieldKey]) return;

      var success = setValue(input, profile[fieldKey]);
      if (success) {
        highlightField(input);
        matched[fieldKey] = true;
        filled++;
        console.log('Fillme FILLED:', fieldKey, '=', profile[fieldKey]);
      }
    });

    console.log('Fillme total filled:', filled, '| matched:', JSON.stringify(matched));
    sendResponse({ filled: filled });
  }

  return true;
});
