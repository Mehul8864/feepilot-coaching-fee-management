/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Bilingual Localization Dictionary (English & Hindi)
 * Supporting Jaipur regional language requirements for parents and staff.
 */

import { LanguageCode } from '../types/domain';

export const translations = {
  en: {
    appTitle: 'FeePilot',
    appSubtitle: 'Coaching Institute Fee Management & Parent Portal',
    clientName: 'Company A, Jaipur',
    clientMeta: '4 Coaching Centres • 2,600 Students • 140 Staff',
    
    // Auth Tabs
    parentTab: 'Parent Login (Mobile OTP)',
    staffTab: 'Accounts Executive (Email)',
    
    // Parent Login Form
    parentHeading: 'Parent Quick-Pay Login',
    parentSubheading: 'Enter your registered mobile number to receive a secure one-time verification code (OTP).',
    mobileLabel: 'Mobile Phone Number',
    mobilePlaceholder: '98765 43210',
    countryCodeLabel: 'Country Code',
    sendOtpBtn: 'Send One-Time Password (OTP)',
    sendingOtp: 'Sending verification code...',
    otpLabel: '6-Digit Verification Code',
    otpPlaceholder: '••••••',
    verifyOtpBtn: 'Verify OTP & Enter Portal',
    verifyingOtp: 'Verifying code...',
    changeNumberBtn: 'Change mobile number',
    resendOtpBtn: 'Resend OTP',
    resendCooldown: 'Resend available in',
    seconds: 's',
    recaptchaNotice: 'Protected by Google Firebase Phone Authentication & reCAPTCHA.',
    
    // Demo Test Box
    testCredentialsTitle: 'Configured Firebase Test Account',
    testPhoneNotice: 'Instant verification pre-configured in Firebase Console (no SMS balance needed):',
    useTestPhoneBtn: 'Fill Test Mobile (+1 650-555-3434)',
    useTestOtpBtn: 'Fill Test Code (824619)',

    // Staff Login Form
    staffHeading: 'Accounts Executive Portal',
    staffSubheading: 'Secure role-based access for authorized Jaipur centre accounts personnel.',
    emailLabel: 'Institute Work Email',
    emailPlaceholder: 'staff.jaipur@feepilot.internal',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    signInBtn: 'Sign In to Executive Console',
    signingIn: 'Authenticating credentials...',
    rbacNoticeTitle: 'Role-Based Access Control (RBAC)',
    rbacNoticeBody: 'Staff accounts are provisioned exclusively through institute administrative workflows. Self-registration is strictly disabled.',
    demoStaffTitle: 'Administrative Staff Provisioning',
    demoStaffNotice: 'Accounts Executive accounts are not pre-created by default. They must be provisioned by an administrator in Firebase Console (Authentication > Users) and assigned to Jaipur centres in Firestore.',
    useStaffDemoBtn: 'Fill Reference Email (staff.jaipur@feepilot.internal)',
    staffDemoCaveat: 'Note: Sign-in will fail until this account is added in Firebase Console.',

    // Messages & Errors
    errInvalidPhone: 'Please enter a valid mobile number with country code.',
    errInvalidOtp: 'Please enter the complete 6-digit verification code.',
    errInvalidCredentials: 'Invalid email or password. Please verify your credentials.',
    errUserNotFound: 'No staff account found with this email. Please contact institute administration.',
    errWrongPassword: 'Incorrect password. Please verify and retry.',
    errTooManyRequests: 'Too many failed attempts. Please wait a moment and try again.',
    errPhoneQuota: 'SMS quota exceeded for today. Please use the configured demo test number.',
    errGenericAuth: 'Authentication failed. Please verify network connectivity and try again.',
    errInvalidVerificationCode: 'Invalid or expired OTP verification code.',
    errUnauthorizedDomain: 'Domain authorization error: This preview domain is not in Firebase Authorized Domains.',
    errAppCredential: 'App verification credential error. In development, please use the test number +1 650-555-3434.',
    errCaptchaFailed: 'Security verification (reCAPTCHA) failed. Please refresh and retry.',
    errNetwork: 'Network connectivity error. Please check your internet connection and retry.',
    errOperationNotAllowed: 'Phone authentication is restricted or region is not enabled (auth/operation-not-allowed). In Firebase Console, check SMS Region Policy under Authentication > Settings.',
    
    // Developer Diagnostic Labels
    devDiagnosticTitle: 'Developer Diagnostics (Firebase Preview)',
    devDiagnosticSubtitle: 'Safe debug trace for preview environment. Zero sensitive credentials are exposed.',
    devStageLabel: 'Failing Stage',
    devErrorCodeLabel: 'Firebase Error Code',
    devActionLabel: 'Recommended Action',
    devDomainLabel: 'Preview Domain',
    devProjectLabel: 'Firebase Project ID',
    devCopyNotice: 'Diagnostics copied to clipboard',
    devCopyBtn: 'Copy Diagnostic Details',
    
    // Portal & Role States
    unlinkedTitle: 'Mobile Authenticated — Student Link Pending',
    unlinkedDesc: 'Your mobile number is verified, but no student profile is currently linked to this phone number.',
    unlinkedAction: 'Please visit or call the accounts desk at your enrolled Jaipur centre (Company A) with your student’s admission receipt or roll number to activate your ledger.',
    linkedTitle: 'Linked Student Accounts',
    parentDashboardTitle: 'Parent Fee & Quick-Pay Portal',
    staffDashboardTitle: 'Accounts Executive Console',
    accessDeniedTitle: 'Access Denied — Unauthorized Role',
    accessDeniedDesc: 'Your authenticated profile lacks authorization for this area. Contact institute IT administration.',
    signOutBtn: 'Sign Out',
    activeUser: 'Signed in as',
    roleLabel: 'System Role',
    centreLabel: 'Authorized Centres',
    backToWorkbench: 'Milestone 1 Testbench',
    returnToLogin: 'Back to Login',
    engineConsole: 'Financial Engine & Rule Testbench',
    viewToggle: 'Switch Interface View'
  },
  hi: {
    appTitle: 'FeePilot (फी-पायलट)',
    appSubtitle: 'कोचिंग संस्थान शुल्क प्रबंधन एवं अभिभावक त्वरित पोर्टल',
    clientName: 'कंपनी ए, जयपुर',
    clientMeta: '4 कोचिंग केंद्र • 2,600 छात्र • 140 स्टाफ',
    
    // Auth Tabs
    parentTab: 'अभिभावक लॉगिन (मोबाइल ओटीपी)',
    staffTab: 'अकाउंट्स एग्जीक्यूटिव (ईमेल)',
    
    // Parent Login Form
    parentHeading: 'अभिभावक त्वरित शुल्क लॉगिन',
    parentSubheading: 'सुरक्षित एकमुश्त सत्यापन कोड (ओटीपी) प्राप्त करने के लिए अपना पंजीकृत मोबाइल नंबर दर्ज करें।',
    mobileLabel: 'मोबाइल फ़ोन नंबर',
    mobilePlaceholder: '98765 43210',
    countryCodeLabel: 'कंट्री कोड',
    sendOtpBtn: 'ओटीपी (OTP) भेजें',
    sendingOtp: 'सत्यापन कोड भेजा जा रहा है...',
    otpLabel: '6-अंकों का सत्यापन कोड (OTP)',
    otpPlaceholder: '••••••',
    verifyOtpBtn: 'ओटीपी सत्यापित करें एवं प्रवेश करें',
    verifyingOtp: 'सत्यापन किया जा रहा है...',
    changeNumberBtn: 'मोबाइल नंबर बदलें',
    resendOtpBtn: 'ओटीपी पुनः भेजें',
    resendCooldown: 'पुनः प्रयास उपलब्ध होगा',
    seconds: 'सेकंड में',
    recaptchaNotice: 'गूगल फायरबेस फ़ोन प्रमाणीकरण एवं reCAPTCHA द्वारा सुरक्षित।',
    
    // Demo Test Box
    testCredentialsTitle: 'कॉन्फ़िगर किया गया टेस्ट खाता (Firebase Console)',
    testPhoneNotice: 'फायरबेस कंसोल में पूर्व-कॉन्फ़िगर किया गया त्वरित परीक्षण नंबर (एसएमएस शुल्क मुक्त):',
    useTestPhoneBtn: 'टेस्ट मोबाइल भरें (+1 650-555-3434)',
    useTestOtpBtn: 'टेस्ट कोड भरें (824619)',

    // Staff Login Form
    staffHeading: 'अकाउंट्स एग्जीक्यूटिव पोर्टल',
    staffSubheading: 'अधिकृत जयपुर केंद्र लेखा कर्मचारियों के लिए सुरक्षित भूमिका-आधारित पहुंच।',
    emailLabel: 'संस्थान की आधिकारिक ईमेल',
    emailPlaceholder: 'staff.jaipur@feepilot.internal',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    signInBtn: 'कंसोल में साइन इन करें',
    signingIn: 'प्रमाणीकरण हो रहा है...',
    rbacNoticeTitle: 'सख्त भूमिका-आधारित नियंत्रण (RBAC)',
    rbacNoticeBody: 'स्टाफ खाते केवल संस्थान के प्रशासनिक तंत्र द्वारा बनाए जाते हैं। सार्वजनिक पंजीकरण पूर्णतः प्रतिबंधित है।',
    demoStaffTitle: 'प्रशासनिक स्टाफ प्रावधान',
    demoStaffNotice: 'अकाउंट्स एग्जीक्यूटिव खाते स्वतः पूर्व-निर्मित नहीं होते। उन्हें व्यवस्थापक द्वारा फायरबेस कंसोल (Authentication > Users) और फायरस्टोर में जोड़ना आवश्यक है।',
    useStaffDemoBtn: 'संदर्भ ईमेल भरें (staff.jaipur@feepilot.internal)',
    staffDemoCaveat: 'नोट: जब तक यह खाता फायरबेस कंसोल में नहीं बनाया जाता, साइन इन विफल रहेगा।',

    // Messages & Errors
    errInvalidPhone: 'कृपया देश कोड के साथ एक मान्य मोबाइल नंबर दर्ज करें।',
    errInvalidOtp: 'कृपया पूरा 6-अंकीय सत्यापन कोड दर्ज करें।',
    errInvalidCredentials: 'अमान्य ईमेल या पासवर्ड। कृपया पुनः जांचें।',
    errUserNotFound: 'इस ईमेल से कोई स्टाफ खाता नहीं मिला। कृपया प्रशासन से संपर्क करें।',
    errWrongPassword: 'गलत पासवर्ड। कृपया पुनः प्रयास करें।',
    errTooManyRequests: 'बहुत अधिक असफल प्रयास। कृपया कुछ समय प्रतीक्षा करें।',
    errPhoneQuota: 'दैनिक एसएमएस सीमा समाप्त। कृपया कॉन्फ़िगर किए गए टेस्ट नंबर का उपयोग करें।',
    errGenericAuth: 'प्रमाणीकरण विफल हुआ। इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।',
    errInvalidVerificationCode: 'अमान्य या समाप्त हो चुका ओटीपी कोड।',
    errUnauthorizedDomain: 'डोमेन प्राधिकरण त्रुटि: यह वेब पता फायरबेस अधिकृत डोमेन सूची में शामिल नहीं है।',
    errAppCredential: 'ऐप सत्यापन त्रुटि। विकास परिवेश में कृपया परीक्षण नंबर +1 650-555-3434 का उपयोग करें।',
    errCaptchaFailed: 'सुरक्षा सत्यापन (reCAPTCHA) विफल रहा। कृपया पृष्ठ रीफ्रेश करें और पुनः प्रयास करें।',
    errNetwork: 'नेटवर्क कनेक्टिविटी त्रुटि। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।',
    errOperationNotAllowed: 'फ़ोन प्रमाणीकरण प्रतिबंधित है या यह क्षेत्र सक्षम नहीं है (auth/operation-not-allowed)। फ़ायरबेस कंसोल में Authentication > Settings के अंतर्गत SMS Region Policy जांचें।',

    // Developer Diagnostic Labels
    devDiagnosticTitle: 'डेवलपर डायग्नोस्टिक्स (फ़ायरबेस पूर्वावलोकन)',
    devDiagnosticSubtitle: 'सुरक्षित डिबग ट्रेस। कोई भी संवेदनशील क्रेडेंशियल उजागर नहीं किया गया है।',
    devStageLabel: 'विफल चरण',
    devErrorCodeLabel: 'फ़ायरबेस त्रुटि कोड',
    devActionLabel: 'सुझाया गया समाधान',
    devDomainLabel: 'पूर्वावलोकन डोमेन',
    devProjectLabel: 'फ़ायरबेस प्रोजेक्ट आईडी',
    devCopyNotice: 'डायग्नोस्टिक्स कॉपी किया गया',
    devCopyBtn: 'डायग्नोस्टिक्स विवरण कॉपी करें',
    
    // Portal & Role States
    unlinkedTitle: 'मोबाइल सत्यापित — छात्र लिंक लंबित',
    unlinkedDesc: 'आपका मोबाइल नंबर सत्यापित हो चुका है, किंतु अभी कोई छात्र प्रोफ़ाइल इस नंबर से संबद्ध नहीं है।',
    unlinkedAction: 'अपने छात्र का खाता सक्रिय करने हेतु रोल नंबर या प्रवेश रसीद के साथ अपने नामांकित जयपुर केंद्र (कंपनी ए) के लेखा काउंटर से संपर्क करें।',
    linkedTitle: 'संबद्ध छात्र खाते',
    parentDashboardTitle: 'अभिभावक शुल्क एवं त्वरित भुगतान पोर्टल',
    staffDashboardTitle: 'अकाउंट्स एग्जीक्यूटिव कंसोल',
    accessDeniedTitle: 'पहुंच अस्वीकृत — अनधिकृत भूमिका',
    accessDeniedDesc: 'आपके प्रमाणित खाते को इस क्षेत्र में प्रवेश की अनुमति नहीं है। संस्थान के आईटी प्रशासन से संपर्क करें।',
    signOutBtn: 'लॉग आउट',
    activeUser: 'लॉग इन उपयोगकर्ता',
    roleLabel: 'सिस्टम भूमिका',
    centreLabel: 'अधिकृत केंद्र',
    backToWorkbench: 'माइलस्टोन 1 टेस्टबेंच',
    returnToLogin: 'लॉगिन पृष्ठ पर लौटें',
    engineConsole: 'वित्तीय इंजन एवं नियम टेस्टबेंच',
    viewToggle: 'इंटरफ़ेस दृश्य बदलें'
  }
};

export function getTranslation(lang: LanguageCode) {
  return translations[lang] || translations.en;
}
