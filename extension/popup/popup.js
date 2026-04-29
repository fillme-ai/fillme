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
