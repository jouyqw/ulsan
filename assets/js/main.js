// ===================================
// Security Functions
// ===================================
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  return String(text).replace(/[&<>"'/]/g, (char) => map[char]);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  // Remove control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove potentially dangerous patterns
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi
  ];
  
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized.trim();
}

function validateAndSanitizeFormData(data) {
  return {
    name: sanitizeInput(data.name),
    phone: sanitizeInput(data.phone),
    email: sanitizeInput(data.email),
    category: sanitizeInput(data.category),
    message: sanitizeInput(data.message),
    captcha: sanitizeInput(data.captcha)
  };
}

// ===================================
// Smooth Scroll Function
// ===================================
function scrollToConsult() {
  window.open(
    "https://naver.me/F0zsrR8L",
    "_blank",
    "noopener,noreferrer"
  );
}


// ===================================
// Header Scroll Effect
// ===================================
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// ===================================
// Captcha System
// ===================================
let currentCaptcha = '';

function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded similar chars like I, O, 0, 1
  let captcha = '';
  
  // Use crypto.getRandomValues for better randomness
  const randomValues = new Uint32Array(6);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(randomValues[i] % chars.length);
    }
  } else {
    // Fallback for older browsers
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  currentCaptcha = captcha;
  const captchaDisplay = document.getElementById('captchaDisplay');
  if (!captchaDisplay) return;
  captchaDisplay.textContent = captcha;
  
  const captchaInput = document.getElementById('captcha');
  if (!captchaInput) return;
  captchaInput.value = '';
  captchaInput.setAttribute('autocomplete', 'off');
  captchaInput.setAttribute('spellcheck', 'false');
}

// ===================================
// Submission Rate Limiting (30 minutes)
// ===================================
function checkSubmissionLimit() {
  const lastSubmission = localStorage.getItem('lastSubmissionTime');
  if (lastSubmission) {
    const now = new Date().getTime();
    const timeDiff = now - parseInt(lastSubmission);
    const minutesDiff = Math.floor(timeDiff / 60000);
    
    if (minutesDiff < 10) {
      const remainingMinutes = 10 - minutesDiff;
      showMessage(
        `상담 신청은 10분에 한 번만 할 수 있습니다.\n${remainingMinutes}분 후에 다시 시도해 주세요.`,
        "error"
      );
      return false;
    }
  }
  return true;
}

function setSubmissionTime() {
  const now = new Date().getTime();
  localStorage.setItem('lastSubmissionTime', now.toString());
}

// ===================================
// Form Submission Handler
// ===================================
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("consultForm");
  if (!form) return;
  
  // Generate initial captcha
  generateCaptcha();

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Check submission rate limit
    if (!checkSubmissionLimit()) {
      return;
    }

    // Get form data
    const rawFormData = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      category: document.getElementById("category").value,
      message: document.getElementById("message").value,
      captcha: document.getElementById("captcha").value,
    };

    // Sanitize form data
    const formData = validateAndSanitizeFormData(rawFormData);

    // Validate form
    if (!validateForm(formData)) {
      return;
    }

    // Validate captcha
    if (formData.captcha.toUpperCase() !== currentCaptcha) {
      showMessage("보안 문자가 일치하지 않습니다. 다시 확인해주세요.", "error");
      generateCaptcha();
      return;
    }

    // Set submission time
    setSubmissionTime();

    // Create email content
    const emailBody = createEmailBody(formData);

    // Send email using mailto (fallback method)
    sendEmail(emailBody, formData);
  });
});

// ===================================
// Form Validation
// ===================================
function validateForm(data) {
  // Name validation
  if (data.name.trim().length < 2) {
    showMessage("성함을 정확히 입력해주세요.", "error");
    return false;
  }
  
  if (data.name.length > 50) {
    showMessage("성함은 50자 이내로 입력해주세요.", "error");
    return false;
  }

  // Phone validation
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  if (!phoneRegex.test(data.phone.replace(/-/g, ""))) {
    showMessage("올바른 연락처를 입력해주세요.", "error");
    return false;
  }

  // Email validation (optional but if provided must be valid)
  if (data.email && !isValidEmail(data.email)) {
    showMessage("올바른 이메일 주소를 입력해주세요.", "error");
    return false;
  }
  
  if (data.email && data.email.length > 100) {
    showMessage("이메일은 100자 이내로 입력해주세요.", "error");
    return false;
  }

  // Category validation
  if (!data.category) {
    showMessage("상담 분야를 선택해주세요.", "error");
    return false;
  }
  
  const allowedCategories = ['민사', '형사', '가사', '부동산', '기업', '노동', '기타'];
  if (!allowedCategories.includes(data.category)) {
    showMessage("올바른 상담 분야를 선택해주세요.", "error");
    return false;
  }

  // Message validation
  if (data.message.trim().length < 10) {
    showMessage("상담 내용을 10자 이상 입력해주세요.", "error");
    return false;
  }
  
  if (data.message.length > 2000) {
    showMessage("상담 내용은 2000자 이내로 입력해주세요.", "error");
    return false;
  }
  
  // Check for suspicious patterns in message
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /<iframe/i,
    /on\w+\s*=/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(data.message))) {
    showMessage("입력하신 내용에 허용되지 않는 문자가 포함되어 있습니다.", "error");
    return false;
  }

  // Privacy checkbox validation
  const privacyCheckbox = document.getElementById("privacy");
  if (!privacyCheckbox.checked) {
    showMessage("개인정보 수집 및 이용에 동의해주세요.", "error");
    return false;
  }

  return true;
}

// ===================================
// Email Validation Helper
// ===================================
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ===================================
// Create Email Body
// ===================================
function createEmailBody(data) {
  // Escape all user inputs to prevent XSS
  const safeName = escapeHtml(data.name);
  const safePhone = escapeHtml(data.phone);
  const safeEmail = escapeHtml(data.email || "미입력");
  const safeCategory = escapeHtml(data.category);
  const safeMessage = escapeHtml(data.message);
  
  return `
[법률상담 신청]

성함: ${safeName}
연락처: ${safePhone}
이메일: ${safeEmail}
상담 분야: ${safeCategory}

상담 내용:
${safeMessage}

---
발송 시각: ${new Date().toLocaleString("ko-KR")}
    `.trim();
}

// ===================================
// Send Email Function
// ===================================
function sendEmail(emailBody, formData) {
  const submitButton = document.querySelector(".submit-button");
  const originalButtonText = submitButton.textContent;
  submitButton.textContent = "전송 중...";
  submitButton.disabled = true;

  // EmailJS 설정 확인
  if (typeof emailjs !== 'undefined' && emailjs.send) {
    // EmailJS를 사용한 이메일 전송
    sendEmailViaEmailJS(formData, submitButton, originalButtonText);
  } else {
    // Fallback: mailto 사용
    sendEmailViaMailto(emailBody, formData, submitButton, originalButtonText);
  }
}

// ===================================
// Send Email via EmailJS
// ===================================
function sendEmailViaEmailJS(formData, submitButton, originalButtonText) {
  // EmailJS 템플릿 파라미터 (이미 sanitize된 데이터 사용)
  const templateParams = {
    from_name: escapeHtml(formData.name),
    from_phone: escapeHtml(formData.phone),
    from_email: escapeHtml(formData.email || '미입력'),
    category: escapeHtml(formData.category),
    message: escapeHtml(formData.message),
    to_email: 'ulsanlawks@naver.com'
  };

  // EmailJS 전송
  emailjs.send("service_x6gcb6g", "template_hb3pl4u", templateParams)
    .then(function(response) {
      console.log('SUCCESS!', response.status, response.text);
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
      
      showMessage(
        "상담 신청이 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.",
        "success"
      );
      
      // Reset form
      document.getElementById("consultForm").reset();
    }, function(error) {
      console.log('FAILED...', error);
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
      
      showMessage(
        "전송에 실패했습니다. 잠시 후 다시 시도해주세요.",
        "error"
      );
    });
}

// ===================================
// Send Email via Mailto (Fallback)
// ===================================
function sendEmailViaMailto(emailBody, formData, submitButton, originalButtonText) {
  const recipientEmail = "ulsanlawks@naver.com";
  const subject = `[법률상담] ${formData.name}님의 ${formData.category} 상담`;

  // mailto 링크 생성
  const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(emailBody)}`;

  // 이메일 클라이언트 열기
  window.location.href = mailtoLink;

  // 버튼 리셋 및 성공 메시지
  setTimeout(() => {
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;

    showMessage(
      "상담 신청이 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.",
      "success"
    );

    // Reset form
    document.getElementById("consultForm").reset();

    // Alternative contact info
    showAlternativeContact(formData);
  }, 1000);
}

// ===================================
// Show Alternative Contact Method
// ===================================
function showAlternativeContact(formData) {
  // If mailto doesn't work well on mobile, show alternative
  console.log("상담 신청 정보:", formData);

  // You can implement a backend API call here instead
  // Example:
  // fetch('/api/send-consultation', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(formData)
  // });
}

// ===================================
// Show Message Function
// ===================================
function showMessage(text, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll(".message");
  existingMessages.forEach((msg) => msg.remove());

  // Create new message
  const message = document.createElement("div");
  message.className = `message ${type} show`;
  message.textContent = text;

  // Insert message before form
  const form = document.getElementById("consultForm");
  if (!form || !form.parentNode) return;
  form.parentNode.insertBefore(message, form);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    message.classList.remove("show");
    setTimeout(() => message.remove(), 300);
  }, 5000);

  // Scroll to message
  message.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ===================================
// Header Scroll Effect
// ===================================
let lastScroll = 0;
const header = document.querySelector(".header");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;
  lastScroll = currentScroll;
});

// ===================================
// Intersection Observer for Animations
// ===================================
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe elements for animation
document.addEventListener("DOMContentLoaded", () => {
  const animatedElements = document.querySelectorAll(
    ".case-card, .principle-item, .feature-card"
  );

  animatedElements.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "all 0.6s ease";
    observer.observe(el);
  });
});

// ===================================
// Phone Number Auto-formatting
// ===================================
const phoneInput = document.getElementById("phone");
if (phoneInput) {
  phoneInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/[^0-9]/g, "");

    if (value.length <= 3) {
      e.target.value = value;
    } else if (value.length <= 7) {
      e.target.value = value.slice(0, 3) + "-" + value.slice(3);
    } else {
      e.target.value =
        value.slice(0, 3) + "-" + value.slice(3, 7) + "-" + value.slice(7, 11);
    }
  });
}

// ===================================
// Character Counter for Message
// ===================================
const messageInput = document.getElementById("message");
if (messageInput) {
  messageInput.addEventListener("input", function (e) {
    const charCount = e.target.value.length;
    const charCountElement = document.getElementById("charCount");
    if (!charCountElement) return;
    const charCountWrapper = charCountElement.parentElement;
    
    charCountElement.textContent = charCount;
    
    // Remove all classes
    charCountWrapper.classList.remove('warning', 'limit');
    
    // Add warning at 1800 characters
    if (charCount >= 1800) {
      charCountWrapper.classList.add('warning');
    }
    
    // Add limit at 2000 characters
    if (charCount >= 2000) {
      charCountWrapper.classList.add('limit');
    }
  });
}

// ===================================
// Prevent form submission on Enter (except in textarea)
// ===================================
const consultForm = document.getElementById("consultForm");
if (consultForm) {
  consultForm.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  });
}

// ===================================
// Tab Switching for Success Cases
// ===================================
document.addEventListener("DOMContentLoaded", function () {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const targetTab = this.getAttribute("data-tab");

      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      this.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
    });
  });
});

// ===================================
// Toggle Cases (Show More/Less)
// ===================================
function toggleCases(tabName) {
  const casesList = document.querySelector(`.cases-list[data-tab="${tabName}"]`);
  const buttons = document.querySelectorAll('.show-more-btn');
  let button = null;
  
  // Find the correct button
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick').includes(tabName)) {
      button = btn;
    }
  });
  
  if (!casesList || !button) return;
  
  const buttonText = button.querySelector('.show-more-text');
  
  if (casesList.classList.contains('expanded')) {
    casesList.classList.remove('expanded');
    button.classList.remove('expanded');
    buttonText.textContent = '더보기';
    
    // Scroll to tab section
    const successSection = document.getElementById('success');
    if (successSection) {
      successSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else {
    casesList.classList.add('expanded');
    button.classList.add('expanded');
    buttonText.textContent = '접기';
  }
}

// ===================================
// Reviews Slider
// ===================================
let currentSlideIndex = 0;
let slideInterval;

function showSlide(index) {
  const slider = document.querySelector('.reviews-slider');
  if (!slider) return;

  const track = slider.querySelector('.review-track');
  const slides = slider.querySelectorAll('.review-card');
  const dots = document.querySelectorAll('.dot');
  if (!track || !slides.length || !dots.length) return;

  const sliderWidth = slider.getBoundingClientRect().width;
  const slideWidth = slides[0].getBoundingClientRect().width;
  const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
  const visibleCount = Math.max(1, Math.floor((sliderWidth + gap) / (slideWidth + gap)));
  const maxIndex = Math.max(0, slides.length - visibleCount);
  
  if (index > maxIndex) {
    currentSlideIndex = 0;
  } else if (index < 0) {
    currentSlideIndex = maxIndex;
  } else {
    currentSlideIndex = index;
  }
  
  slides.forEach(slide => slide.classList.remove('active'));
  dots.forEach(dot => dot.classList.remove('active'));
  
  track.style.transform = `translateX(-${currentSlideIndex * (slideWidth + gap)}px)`;
  slides[currentSlideIndex].classList.add('active');
  if (dots[currentSlideIndex]) {
    dots[currentSlideIndex].classList.add('active');
  }
}

function moveSlide(direction) {
  clearInterval(slideInterval);
  showSlide(currentSlideIndex + direction);
  startAutoSlide();
}

function currentSlide(index) {
  clearInterval(slideInterval);
  showSlide(index);
  startAutoSlide();
}

window.moveSlide = moveSlide;
window.currentSlide = currentSlide;

function startAutoSlide() {
  if (!document.querySelector('.reviews-slider')) return;

  slideInterval = setInterval(() => {
    showSlide(currentSlideIndex + 1);
  }, 5000); // 5초마다 자동 슬라이드
}

// Initialize slider only when the old slider markup exists.
function initReviewSlider() {
  if (!document.querySelector('.reviews-slider')) return;

  showSlide(0);
  startAutoSlide();

  document.querySelectorAll('[data-slide-direction]').forEach((button) => {
    button.addEventListener('click', () => {
      moveSlide(Number(button.dataset.slideDirection));
    });
  });

  document.querySelectorAll('[data-slide-index]').forEach((button) => {
    button.addEventListener('click', () => {
      currentSlide(Number(button.dataset.slideIndex));
    });
  });
}

document.addEventListener('DOMContentLoaded', initReviewSlider);
window.addEventListener('resize', () => {
  if (document.querySelector('.reviews-slider')) {
    showSlide(currentSlideIndex);
  }
});

// ===================================
// Live Consultation List
// ===================================
function initLiveConsultList() {
  const list = document.querySelector('[data-live-consults]');
  if (!list) return;

  const cases = [
    { category: '형사사건', name: '오**', status: '접수완료' },
    { category: '음주운전', name: '김**', status: '예약완료' },
    { category: '민사소송', name: '신**', status: '접수완료' },
    { category: '성범죄', name: '박**', status: '상담완료' },
    { category: '상간자소송', name: '이**', status: '접수완료' },
    { category: '마약사건', name: '최**', status: '예약완료' },
    { category: '강제추행', name: '정**', status: '상담완료' },
    { category: '사기고소', name: '윤**', status: '접수완료' },
    { category: '교통사고', name: '한**', status: '상담완료' },
    { category: '이혼소송', name: '장**', status: '예약완료' },
    { category: '전세분쟁', name: '문**', status: '접수완료' }
  ];

  const formatDate = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  const renderRows = () => {
    list.innerHTML = cases.slice(0, 5).map((item, index) => `
      <div class="consult-row${index === 0 ? ' live-enter' : ''}">
        <strong>${item.category}</strong>
        <span>${item.name}</span>
        <time>${formatDate(index)}</time>
        <em>${item.status}</em>
      </div>
    `).join('');
  };

  renderRows();

  setInterval(() => {
    cases.unshift(cases.pop());
    renderRows();
  }, 3200);
}

document.addEventListener('DOMContentLoaded', initLiveConsultList);

// ===================================
// Privacy Modal Functions
// ===================================
function openPrivacyModal(event) {
  event.preventDefault();
  const modal = document.getElementById('privacyModal');
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closePrivacyModal() {
  const modal = document.getElementById('privacyModal');
  modal.classList.remove('show');
  document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  const modal = document.getElementById('privacyModal');
  if (event.target === modal) {
    closePrivacyModal();
  }
});

// ===================================
// Auto Update Copyright Year
// ===================================
document.addEventListener('DOMContentLoaded', function() {
  const yearElement = document.getElementById('currentYear');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
});

// ===================================
// Scroll to Top Function
// ===================================
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Show/Hide Scroll to Top button based on scroll position
window.addEventListener('scroll', function() {
  const scrollTopBtn = document.querySelector('.scroll-top');
  if (scrollTopBtn) {
    if (window.pageYOffset > 300) {
      scrollTopBtn.style.opacity = '1';
      scrollTopBtn.style.pointerEvents = 'auto';
    } else {
      scrollTopBtn.style.opacity = '0';
      scrollTopBtn.style.pointerEvents = 'none';
    }
  }
  
  // Show/Hide floating buttons after hero section
  const floatingButtons = document.querySelector('.floating-buttons');
  const heroSection = document.querySelector('.hero');
  const reviewsSection = document.querySelector('.reviews');
  
  if (floatingButtons && heroSection) {
    const heroHeight = heroSection.offsetHeight;
    
    if (window.pageYOffset > heroHeight - 100) {
      floatingButtons.classList.add('visible');
    } else {
      floatingButtons.classList.remove('visible');
    }
    
    // Hide other floating buttons (except scroll-top) after reviews section
    if (reviewsSection) {
      const reviewsTop = reviewsSection.offsetTop;
      const otherButtons = floatingButtons.querySelectorAll('.floating-btn:not(.scroll-top)');
      
      if (window.pageYOffset >= reviewsTop - 100) {
        otherButtons.forEach(btn => {
          btn.style.display = 'none';
        });
      } else {
        otherButtons.forEach(btn => {
          btn.style.display = 'flex';
        });
      }
    }
  }
});

// ===================================
// Mobile Menu Toggle
// ===================================
function toggleMobileMenu() {
  const nav = document.getElementById('mobileNav');
  const btn = document.querySelector('.mobile-menu-btn');
  
  nav.classList.toggle('active');
  btn.classList.toggle('active');
  
  // Prevent body scroll when menu is open
  if (nav.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }
}

function closeMobileMenu() {
  const nav = document.getElementById('mobileNav');
  const btn = document.querySelector('.mobile-menu-btn');
  
  nav.classList.remove('active');
  btn.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Close mobile menu on window resize
window.addEventListener('resize', function() {
  if (window.innerWidth >= 768) {
    closeMobileMenu();
  }
});

// ===================================
// Active Navigation Link on Scroll
// ===================================
window.addEventListener('scroll', function() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  
  let current = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    
    if (window.pageYOffset >= sectionTop - 200) {
      current = section.getAttribute('id');
    }
  });

  if (!current) {
    return;
  }
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) {
      return;
    }

    link.classList.remove('active');
    if (href === '#' + current) {
      link.classList.add('active');
    }
  });
});
