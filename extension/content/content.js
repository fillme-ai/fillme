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
  { keywords: ['직무', '직책', '직위', '담당직무'], field: 'position' },
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

// Get label texts for an input — returns array ordered by proximity (closest first)
function getLabelTexts(input) {
  var texts = [];

  // 1. label[for] — 가장 정확
  if (input.id) {
    try {
      var label = document.querySelector('label[for="' + CSS.escape(input.id) + '"]');
      if (label) texts.push(label.textContent.trim().toLowerCase());
    } catch(e) {}
  }

  // 2. Parent label
  var parentLabel = input.closest('label');
  if (parentLabel) texts.push(parentLabel.textContent.trim().toLowerCase());

  // 3. aria-label
  if (input.getAttribute('aria-label')) texts.push(input.getAttribute('aria-label').toLowerCase());

  // 4. 가장 가까운 부모에서 라벨 텍스트 찾기 (2-3 레벨만)
  var el = input;
  for (var i = 0; i < 4; i++) {
    el = el.parentElement;
    if (!el) break;

    // 이 레벨의 직접 자식 중 input을 포함하지 않는 텍스트 노드/요소
    for (var j = 0; j < el.childNodes.length; j++) {
      var child = el.childNodes[j];
      if (child === input || (child.nodeType === 1 && child.contains(input))) continue;

      var txt = '';
      if (child.nodeType === 3) txt = child.textContent.trim();
      else if (child.nodeType === 1 && child.children.length === 0) txt = child.textContent.trim();

      if (txt.length > 0 && txt.length < 25) {
        texts.push(txt.toLowerCase());
        return texts; // 가장 가까운 라벨을 찾으면 바로 반환
      }
    }

    // 바로 위 형제 요소 확인
    var prevSib = el.previousElementSibling;
    if (prevSib) {
      // 형제의 직접 텍스트만 (다른 input의 라벨은 제외)
      var sibText = '';
      for (var k = 0; k < prevSib.childNodes.length; k++) {
        var sChild = prevSib.childNodes[k];
        if (sChild.nodeType === 3 || (sChild.nodeType === 1 && sChild.children.length === 0)) {
          var t = sChild.textContent.trim();
          if (t.length > 0 && t.length < 25) { sibText = t; break; }
        }
      }
      if (sibText) {
        texts.push(sibText.toLowerCase());
        return texts;
      }
    }
  }

  // 5. placeholder (최후의 수단)
  if (input.placeholder) texts.push(input.placeholder.toLowerCase());

  // 6. name attribute
  if (input.name) texts.push(input.name.toLowerCase());

  return texts;
}

// Match field from label texts array
function matchField(labelTexts, input) {
  if (typeof labelTexts === 'string') labelTexts = [labelTexts];

  // 각 라벨 텍스트를 가까운 순서대로 확인
  for (var t = 0; t < labelTexts.length; t++) {
    var text = labelTexts[t];

    for (var i = 0; i < FIELD_MAP.length; i++) {
      var map = FIELD_MAP[i];
      // exclude 키워드 체크
      if (map.exclude) {
        var excluded = false;
        for (var k = 0; k < map.exclude.length; k++) {
          if (text.includes(map.exclude[k].toLowerCase())) { excluded = true; break; }
        }
        if (excluded) continue;
      }
      for (var j = 0; j < map.keywords.length; j++) {
        if (text.includes(map.keywords[j].toLowerCase())) {
          return map.field;
        }
      }
    }
  }

  // placeholder 패턴 추측
  var ph = input ? (input.placeholder || '') : '';
  if (ph.includes('@') || ph.includes('domain')) return 'email';
  if (/^010/.test(ph) || /^\d{10,11}$/.test(ph)) return 'phone';
  if (ph.includes('homepage') || ph.includes('http')) return 'url';

  // input type 추측
  if (input) {
    if (input.type === 'email') return 'email';
    if (input.type === 'tel') return 'phone';
    if (input.type === 'url') return 'url';
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
    inputs.forEach(function(inp) {
      var labels = getLabelTexts(inp);
      var matched = matchField(labels, inp);
      console.log('Fillme detect:', inp.tagName, '| labels:', JSON.stringify(labels), '→', matched || '(no match)');
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

    // 첫 번째 패스: 라벨/placeholder 기반 매칭
    // 매칭 안 된 generic input은 두 번째 패스에서 순서 기반으로 추측

    inputs.forEach(function(input, idx) {
      var labelTexts = getLabelTexts(input);
      var fieldKey = matchField(labelTexts, input);
      console.log('Fillme [' + idx + ']:', input.tagName, input.type || '', '| labels:', JSON.stringify(labelTexts), '→', fieldKey || 'NO MATCH');

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
