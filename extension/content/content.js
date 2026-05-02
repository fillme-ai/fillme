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
  // 경력 기간
  { keywords: ['유관 경력', '유관경력', '경력 기간', '경력기간', '총 경력', '경력을 선택', '기간을 선택', '기간을선택'], field: 'careerYears' },
  // 연봉
  { keywords: ['희망연봉', '희망 연봉'], field: 'salaryDesired' },
  { keywords: ['직전연봉', '직전 연봉', '현재연봉'], field: 'salaryPrev' },
  // 보훈/장애/병역
  { keywords: ['보훈', '국가유공'], field: 'veteran' },
  { keywords: ['장애', '장애여부', '장애정보'], field: 'disability' },
  { keywords: ['병역', '군복무', '군필', 'military'], field: 'military' },
  // URL
  { keywords: ['url', '홈페이지', 'github', 'linkedin', '블로그', 'blog', '유관 url'], field: 'url' },
  // 지원동기
  { keywords: ['지원동기', '지원 동기', '지원사유', '지원 사유', '지원한 사유', '지원한 이유'], field: 'motivation' }
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

  // 5. 좌표 기반: input 바로 위에 있는 텍스트 요소 찾기
  try {
    var inputRect = input.getBoundingClientRect();
    var allElements = document.querySelectorAll('span, div, p, label, h3, h4, h5, dt, th');
    var closest = null;
    var closestDist = Infinity;
    for (var ci = 0; ci < allElements.length; ci++) {
      var cel = allElements[ci];
      if (cel.contains(input) || cel.children.length > 2) continue;
      var txt = cel.textContent.trim();
      if (txt.length < 1 || txt.length > 25) continue;
      var celRect = cel.getBoundingClientRect();
      // input 위에 있고, 가로 위치가 비슷한 요소
      if (celRect.bottom <= inputRect.top + 5 && celRect.bottom > inputRect.top - 80) {
        var hDist = Math.abs(celRect.left - inputRect.left);
        var vDist = inputRect.top - celRect.bottom;
        var dist = vDist + hDist * 0.5;
        if (dist < closestDist) {
          closestDist = dist;
          closest = txt;
        }
      }
    }
    if (closest) {
      texts.push(closest.toLowerCase());
      return texts;
    }
  } catch(e) {}

  // 6. placeholder (최후의 수단)
  if (input.placeholder) texts.push(input.placeholder.toLowerCase());

  // 7. name attribute
  if (input.name) texts.push(input.name.toLowerCase());

  return texts;
}

// Match field from label texts array
function matchField(labelTexts, input) {
  if (typeof labelTexts === 'string') labelTexts = [labelTexts];

  // 각 라벨 텍스트를 가까운 순서대로 확인
  for (var t = 0; t < labelTexts.length; t++) {
    var text = labelTexts[t];
    // 공백/특수공백 제거 버전도 준비 (non-breaking space 대응)
    var textNoSpace = text.replace(/[\s\u00a0\u3000]+/g, '');

    for (var i = 0; i < FIELD_MAP.length; i++) {
      var map = FIELD_MAP[i];
      if (map.exclude) {
        var excluded = false;
        for (var k = 0; k < map.exclude.length; k++) {
          if (text.includes(map.exclude[k].toLowerCase())) { excluded = true; break; }
        }
        if (excluded) continue;
      }
      for (var j = 0; j < map.keywords.length; j++) {
        var kw = map.keywords[j].toLowerCase();
        var kwNoSpace = kw.replace(/\s+/g, '');
        if (text.includes(kw) || textNoSpace.includes(kwNoSpace)) {
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

// Get all fillable inputs (including custom dropdowns)
function getInputs() {
  var inputs = Array.from(document.querySelectorAll(
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

  // 커스텀 드롭다운도 추가 (ninehire 등 React 기반 셀렉트)
  document.querySelectorAll('[class*="select"], [class*="Select"], [role="combobox"], [role="listbox"]').forEach(function(el) {
    var rect = el.getBoundingClientRect();
    if (rect.width > 30 && rect.height > 20 && !inputs.includes(el)) {
      el._isCustomSelect = true;
      inputs.push(el);
    }
  });

  return inputs;
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

// Handle custom select/dropdown components
function handleCustomSelect(el, value) {
  if (!value) return false;
  var val = value.toLowerCase();

  // 보훈/장애 기본값 매핑
  if (val === 'no') val = '비대상';
  if (val === 'yes') val = '대상';

  console.log('Fillme custom select: trying to set', val, 'on', el.tagName, el.className.substring(0, 30));

  try {
    // 클릭 가능한 요소 찾기
    var clickTarget = el.querySelector('button, [class*="control"], [class*="trigger"], [class*="value"], [class*="placeholder"]') || el;
    // React 호환 클릭
    clickTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    clickTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    clickTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    console.log('Fillme: clicked dropdown trigger');

    // 300ms 후 옵션 선택 (1회만)
    setTimeout(function() {
      var options = document.querySelectorAll(
        '[class*="option"], [class*="Option"], [role="option"], ' +
        '[class*="menu"] li, [class*="Menu"] li'
      );

      var bestMatch = null;
      options.forEach(function(opt) {
        var optText = opt.textContent.trim();
        if (!optText || optText.length > 30) return;
        // 정확히 일치하는 것 우선
        if (optText.toLowerCase() === val) {
          bestMatch = opt;
        }
        // 포함 매칭 (정확 매칭 없을 때만)
        if (!bestMatch && optText.toLowerCase().includes(val)) {
          bestMatch = opt;
        }
      });

      // 경력 기간: 숫자 기반 범위 매칭 ("7년 8개월" → "7년 이상" 또는 "5년~10년")
      if (!bestMatch && /\d+년/.test(val)) {
        var targetYears = parseInt(val);
        var bestYearMatch = null;
        var bestYearDiff = Infinity;
        options.forEach(function(opt) {
          var optText = opt.textContent.trim();
          if (!optText) return;
          // "7년 이상", "5년~10년", "7년" 등 패턴
          var nums = optText.match(/(\d+)/g);
          if (nums) {
            nums.forEach(function(n) {
              var diff = Math.abs(parseInt(n) - targetYears);
              if (diff < bestYearDiff) {
                bestYearDiff = diff;
                bestYearMatch = opt;
              }
            });
          }
        });
        if (bestYearMatch) bestMatch = bestYearMatch;
      }

      if (bestMatch) {
        bestMatch.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        bestMatch.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        bestMatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        console.log('Fillme: selected option:', bestMatch.textContent.trim());
      } else {
        document.body.click();
        console.log('Fillme: no matching option found for', val);
      }
    }, 300);

    return true;
  } catch(e) {
    console.log('Custom select error:', e);
    return false;
  }
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

    // 경력 기간 자동 계산
    if (!profile.careerYears && profile.careers && profile.careers.length > 0) {
      var totalMonths = 0;
      profile.careers.forEach(function(c) {
        if (c.start) {
          var start = c.start.replace('-', '.').replace('-', '.');
          var endStr = c.end === '재직중' ? new Date().getFullYear() + '.' + String(new Date().getMonth()+1).padStart(2,'0') : c.end.replace('-', '.');
          var sParts = start.split('.');
          var eParts = endStr.split('.');
          if (sParts.length >= 2 && eParts.length >= 2) {
            totalMonths += (parseInt(eParts[0]) - parseInt(sParts[0])) * 12 + (parseInt(eParts[1]) - parseInt(sParts[1]));
          }
        }
      });
      var years = Math.floor(totalMonths / 12);
      var months = totalMonths % 12;
      profile.careerYears = years + '년' + (months > 0 ? ' ' + months + '개월' : '');
    }

    // 지원동기 AI 생성 (페이지 JD + 이력서 기반)
    if (!profile.motivation) {
      // 페이지에서 공고 제목/내용 추출
      var pageTitle = document.title || '';
      var pageText = document.body.innerText.substring(0, 1500);
      profile._jobContext = pageTitle + ' ' + pageText.substring(0, 500);
    }
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

      if (!fieldKey) return;
      if (matched[fieldKey]) return;

      // 보훈/장애 기본값: 프로필에 없으면 "비대상"
      if ((fieldKey === 'veteran' || fieldKey === 'disability') && !profile[fieldKey]) {
        profile[fieldKey] = 'no';
      }

      // 경력 기간: select인 경우 가장 가까운 옵션 선택
      if (fieldKey === 'careerYears' && profile[fieldKey] && input.tagName === 'SELECT') {
        var years = parseInt(profile.careerYears);
        var options = Array.from(input.options);
        var bestMatch = null;
        options.forEach(function(opt) {
          var optYears = parseInt(opt.text);
          if (!isNaN(optYears) && optYears <= years) bestMatch = opt;
        });
        // "7년" 이상 같은 범위 옵션 찾기
        if (!bestMatch) {
          bestMatch = options.find(function(opt) {
            return opt.text.includes(years + '년') || opt.text.includes(years + '~');
          });
        }
        if (bestMatch) {
          input.value = bestMatch.value;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          highlightField(input);
          matched[fieldKey] = true;
          filled++;
          console.log('Fillme FILLED:', fieldKey, '=', bestMatch.text);
        }
        return;
      }

      if (!profile[fieldKey]) return;

      var success = false;
      if (input._isCustomSelect) {
        // 커스텀 드롭다운: 클릭 → 옵션 선택
        success = handleCustomSelect(input, profile[fieldKey]);
      } else {
        success = setValue(input, profile[fieldKey]);
      }
      if (success) {
        highlightField(input);
        matched[fieldKey] = true;
        filled++;
        console.log('Fillme FILLED:', fieldKey, '=', profile[fieldKey]);
      }
    });

    console.log('Fillme total filled:', filled, '| matched:', JSON.stringify(matched));

    // 지원동기 AI 생성 (매칭된 textarea가 있고 비어있으면)
    var motivationInput = null;
    inputs.forEach(function(inp) {
      var labels = getLabelTexts(inp);
      var fk = matchField(labels, inp);
      if (fk === 'motivation' && inp.tagName === 'TEXTAREA') motivationInput = inp;
    });

    if (motivationInput && !motivationInput.value && profile.name) {
      // API 키 가져와서 지원동기 생성
      chrome.storage.local.get('apiKey', function(data) {
        if (!data.apiKey) return;
        var jobTitle = document.title || '';
        var jobDesc = '';
        // 페이지에서 공고 내용 추출 시도
        var mainContent = document.querySelector('main, [class*="content"], [class*="detail"]');
        if (mainContent) jobDesc = mainContent.innerText.substring(0, 1000);
        else jobDesc = document.body.innerText.substring(0, 1000);

        var resumeSummary = '이름: ' + (profile.name || '') +
          ', 경력: ' + (profile.careers || []).map(function(c) { return c.company + ' ' + c.position + ' (' + c.start + '~' + c.end + ')'; }).join(', ') +
          ', 학력: ' + (profile.education || []).map(function(e) { return e.school + ' ' + e.major; }).join(', ') +
          ', 자격증: ' + (profile.certs || '');

        var prompt = '채용 지원서의 지원동기를 작성해주세요.\n' +
          '조건:\n' +
          '- 200~400자 이내\n' +
          '- 지원자의 경력과 이 포지션의 연관성을 강조\n' +
          '- 구체적이고 진정성 있게\n' +
          '- 존댓말로 작성\n' +
          '- 텍스트만 출력 (JSON 아님)\n\n' +
          '공고 제목: ' + jobTitle + '\n' +
          '공고 내용: ' + jobDesc.substring(0, 500) + '\n\n' +
          '지원자 정보: ' + resumeSummary;

        fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + data.apiKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        })
        .then(function(res) { return res.json(); })
        .then(function(aiData) {
          try {
            var motivation = aiData.candidates[0].content.parts[0].text;
            setValue(motivationInput, motivation.trim());
            highlightField(motivationInput);
            console.log('Fillme: 지원동기 AI 생성 완료');
          } catch(e) {
            console.log('Fillme: 지원동기 생성 실패', e);
          }
        });
      });
    }

    sendResponse({ filled: filled });
  }

  return true;
});
