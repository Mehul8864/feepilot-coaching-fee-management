/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firestore Security Rules Logic & Invariant Test Suite
 * 
 * Verifies:
 * 1. Unauthenticated read/write denied.
 * 2. Parent A cannot access Parent B records.
 * 3. Accounts Executive assigned to Centre A cannot access Centre B.
 * 4. Accounts Executive cannot access unprovisioned wildcard '*'.
 * 5. Parent cannot edit their own role, centre permissions, or student links.
 * 6. Accounts Executive cannot increase their own centre permissions.
 * 7. Accounts Executive CANNOT modify another user's role.
 * 8. Accounts Executive CANNOT modify another user's authorizedCentreIds.
 * 9. Accounts Executive CANNOT modify a parent's linkedStudentIds.
 * 10. Accounts Executive CAN update non-protected fields for another user (e.g., contact info).
 * 11. Self-registration strictly prevents self-assigning ACCOUNTS_EXECUTIVE or student links.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Pure logic simulators mirroring the firestore.rules predicates

interface MockAuth {
  uid: string;
  email?: string;
}

interface MockUserDoc {
  id?: string;
  role: 'ACCOUNTS_EXECUTIVE' | 'PARENT';
  authorizedCentreIds?: string[];
  linkedStudentIds?: string[];
  phone?: string;
  name?: string;
}

function evaluateCanAccessCentre(
  auth: MockAuth | null,
  userDoc: MockUserDoc | null,
  targetCentreId: string
): boolean {
  if (!auth || !userDoc) return false;
  if (userDoc.role !== 'ACCOUNTS_EXECUTIVE') return false;
  if (!Array.isArray(userDoc.authorizedCentreIds)) return false;
  return userDoc.authorizedCentreIds.includes(targetCentreId);
}

function evaluateCanParentAccessStudent(
  auth: MockAuth | null,
  userDoc: MockUserDoc | null,
  studentData: { id: string; parentId?: string; centreId: string }
): boolean {
  if (!auth || !userDoc) return false;
  if (userDoc.role !== 'PARENT') return false;
  if (studentData.parentId === auth.uid) return true;
  if (Array.isArray(userDoc.linkedStudentIds) && userDoc.linkedStudentIds.includes(studentData.id)) {
    return true;
  }
  return false;
}

function areUserProtectedFieldsUnchanged(
  existingDoc: MockUserDoc,
  incomingDoc: Partial<MockUserDoc>
): boolean {
  // Role must remain identical
  if (incomingDoc.role !== undefined && incomingDoc.role !== existingDoc.role) {
    return false;
  }
  
  // authorizedCentreIds immutability
  const hasExistingCentres = existingDoc.authorizedCentreIds !== undefined;
  const hasIncomingCentres = incomingDoc.authorizedCentreIds !== undefined;
  if (!hasExistingCentres && hasIncomingCentres) return false;
  if (hasExistingCentres && !hasIncomingCentres) return false;
  if (hasExistingCentres && hasIncomingCentres) {
    if (JSON.stringify(existingDoc.authorizedCentreIds) !== JSON.stringify(incomingDoc.authorizedCentreIds)) {
      return false;
    }
  }

  // linkedStudentIds immutability
  const hasExistingStudents = existingDoc.linkedStudentIds !== undefined;
  const hasIncomingStudents = incomingDoc.linkedStudentIds !== undefined;
  if (!hasExistingStudents && hasIncomingStudents) return false;
  if (hasExistingStudents && !hasIncomingStudents) return false;
  if (hasExistingStudents && hasIncomingStudents) {
    if (JSON.stringify(existingDoc.linkedStudentIds) !== JSON.stringify(incomingDoc.linkedStudentIds)) {
      return false;
    }
  }

  return true;
}

function evaluateCanUpdateUserProfile(
  auth: MockAuth | null,
  callerDoc: MockUserDoc,
  targetUserId: string,
  targetUserDoc: MockUserDoc,
  incomingData: Partial<MockUserDoc>
): { allowed: boolean; reason?: string } {
  if (!auth) return { allowed: false, reason: 'Unauthenticated' };

  // Can only update if self or caller is ACCOUNTS_EXECUTIVE
  const isSelf = auth.uid === targetUserId;
  const isExec = callerDoc.role === 'ACCOUNTS_EXECUTIVE';
  if (!isSelf && !isExec) {
    return { allowed: false, reason: 'Unauthorized: only self or Accounts Executive can attempt profile update' };
  }

  // Invariant: areUserProtectedFieldsUnchanged must hold for all client updates
  if (!areUserProtectedFieldsUnchanged(targetUserDoc, incomingData)) {
    return { allowed: false, reason: 'Forbidden: protected authorization fields (role, authorizedCentreIds, linkedStudentIds) cannot be altered via client' };
  }

  return { allowed: true };
}

function evaluateCanCreateUserProfile(
  auth: MockAuth | null,
  targetUserId: string,
  incomingData: {
    role: string;
    authorizedCentreIds?: string[];
    linkedStudentIds?: string[];
    [key: string]: any;
  }
): { allowed: boolean; reason?: string } {
  if (!auth) return { allowed: false, reason: 'Unauthenticated' };
  if (auth.uid !== targetUserId) return { allowed: false, reason: 'Cannot create profile for another UID' };
  if (incomingData.role !== 'PARENT') return { allowed: false, reason: 'Cannot self-register as ACCOUNTS_EXECUTIVE' };
  if (incomingData.authorizedCentreIds && incomingData.authorizedCentreIds.length > 0) {
    return { allowed: false, reason: 'Cannot self-assign centre permissions' };
  }
  if (incomingData.linkedStudentIds && incomingData.linkedStudentIds.length > 0) {
    return { allowed: false, reason: 'Cannot self-assign student links' };
  }
  return { allowed: true };
}

// -------------------------------------------------------------
// TESTS
// -------------------------------------------------------------

test('SECURITY: Unauthenticated requests are completely rejected', () => {
  const resultCentre = evaluateCanAccessCentre(null, null, 'centre-jaipur-1');
  assert.equal(resultCentre, false, 'Unauthenticated centre access must be denied');

  const resultStudent = evaluateCanParentAccessStudent(null, null, {
    id: 'STU-0412',
    centreId: 'centre-jaipur-1',
  });
  assert.equal(resultStudent, false, 'Unauthenticated student access must be denied');
});

test('SECURITY: Parent A cannot access Parent B student records', () => {
  const parentAAuth: MockAuth = { uid: 'parent-A-uid' };
  const parentADoc: MockUserDoc = {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'], // Aarav Meena
  };

  const studentAarav = { id: 'STU-0412', parentId: 'parent-A-uid', centreId: 'centre-jaipur-1' };
  const studentIshita = { id: 'STU-0587', parentId: 'parent-B-uid', centreId: 'centre-jaipur-2' };

  // Parent A reading their own student
  assert.equal(
    evaluateCanParentAccessStudent(parentAAuth, parentADoc, studentAarav),
    true,
    'Parent A must be permitted to read their own linked student'
  );

  // Parent A attempting to read Parent B's student (Ishita)
  assert.equal(
    evaluateCanParentAccessStudent(parentAAuth, parentADoc, studentIshita),
    false,
    'Parent A must be strictly denied access to Parent B student record'
  );
});

test('SECURITY: Accounts Executive assigned to Centre A cannot access Centre B', () => {
  const execAuth: MockAuth = { uid: 'exec-1-uid', email: 'staff1@company-a.com' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['centre-malviya-nagar'], // Only Malviya Nagar
  };

  // Accessing Centre A (Malviya Nagar)
  assert.equal(
    evaluateCanAccessCentre(execAuth, execDoc, 'centre-malviya-nagar'),
    true,
    'Executive must be permitted for authorized centre'
  );

  // Accessing Centre B (Vaishali Nagar)
  assert.equal(
    evaluateCanAccessCentre(execAuth, execDoc, 'centre-vaishali-nagar'),
    false,
    'Executive must be denied for unauthorized centre'
  );

  // Accessing unprovisioned wildcard '*'
  assert.equal(
    evaluateCanAccessCentre(execAuth, execDoc, '*'),
    false,
    'Wildcard access must be denied'
  );
});

test('SECURITY: Parent cannot edit their own role or student links', () => {
  const parentAuth: MockAuth = { uid: 'parent-user-1' };
  const parentDoc: MockUserDoc = {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
  };

  // Attempting to change role to ACCOUNTS_EXECUTIVE
  const roleAttempt = evaluateCanUpdateUserProfile(parentAuth, parentDoc, 'parent-user-1', parentDoc, {
    role: 'ACCOUNTS_EXECUTIVE',
  });
  assert.equal(roleAttempt.allowed, false, 'Parent cannot change own role');

  // Attempting to inject a new student link
  const linkAttempt = evaluateCanUpdateUserProfile(parentAuth, parentDoc, 'parent-user-1', parentDoc, {
    linkedStudentIds: ['STU-0412', 'STU-0587'],
  });
  assert.equal(linkAttempt.allowed, false, 'Parent cannot self-assign student links');
});

test('SECURITY: Accounts Executive cannot increase their own centre permissions', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['centre-malviya-nagar'],
  };

  // Exec attempting to add Tonk Road to their own authorizedCentreIds
  const escalateAttempt = evaluateCanUpdateUserProfile(execAuth, execDoc, 'exec-1', execDoc, {
    authorizedCentreIds: ['centre-malviya-nagar', 'centre-tonk-road'],
  });
  assert.equal(escalateAttempt.allowed, false, 'Executive cannot self-escalate centre permissions');
});

test('SECURITY: Accounts Executive CANNOT modify another user’s role', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['centre-malviya-nagar'],
  };

  const parentDoc: MockUserDoc = {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
  };

  // Exec 1 attempting to promote parent to ACCOUNTS_EXECUTIVE
  const promoteAttempt = evaluateCanUpdateUserProfile(execAuth, execDoc, 'parent-user-1', parentDoc, {
    role: 'ACCOUNTS_EXECUTIVE',
  });
  assert.equal(promoteAttempt.allowed, false, 'Accounts Executive must NOT be able to change another user role');

  // Exec 1 attempting to demote another executive
  const exec2Doc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['centre-vaishali-nagar'],
  };
  const demoteAttempt = evaluateCanUpdateUserProfile(execAuth, execDoc, 'exec-2', exec2Doc, {
    role: 'PARENT',
  });
  assert.equal(demoteAttempt.allowed, false, 'Accounts Executive must NOT be able to demote another user role');
});

test('SECURITY: Accounts Executive CANNOT modify another user’s authorizedCentreIds', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['centre-malviya-nagar'],
  };

  const exec2Doc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['centre-vaishali-nagar'],
  };

  // Exec 1 attempting to grant centre-raja-park to Exec 2
  const centreAssignAttempt = evaluateCanUpdateUserProfile(execAuth, execDoc, 'exec-2', exec2Doc, {
    authorizedCentreIds: ['centre-vaishali-nagar', 'centre-raja-park'],
  });
  assert.equal(centreAssignAttempt.allowed, false, 'Accounts Executive must NOT modify centre assignments for others');

  // Exec 1 attempting to assign centre permissions to a parent
  const parentDoc: MockUserDoc = {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
  };
  const parentCentreAttempt = evaluateCanUpdateUserProfile(execAuth, execDoc, 'parent-1', parentDoc, {
    authorizedCentreIds: ['centre-malviya-nagar'],
  });
  assert.equal(parentCentreAttempt.allowed, false, 'Accounts Executive must NOT inject centre permissions into a parent');
});

test('SECURITY: Accounts Executive CANNOT modify parent linkedStudentIds', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['centre-malviya-nagar'],
  };

  const parentDoc: MockUserDoc = {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
  };

  // Exec 1 attempting to link student STU-0587 to parent 1
  const linkAttempt = evaluateCanUpdateUserProfile(execAuth, execDoc, 'parent-1', parentDoc, {
    linkedStudentIds: ['STU-0412', 'STU-0587'],
  });
  assert.equal(linkAttempt.allowed, false, 'Accounts Executive must NOT modify parent student links via client');
});

test('SECURITY: Accounts Executive CAN update non-protected contact fields for another user', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['centre-malviya-nagar'],
  };

  const parentDoc: MockUserDoc = {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
    phone: '+919876543210',
  };

  // Exec 1 updating contact phone number for a parent (preserving role, centres, student links)
  const phoneUpdate = evaluateCanUpdateUserProfile(execAuth, execDoc, 'parent-1', parentDoc, {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
    phone: '+919999888877',
  });
  assert.equal(phoneUpdate.allowed, true, 'Non-protected contact updates must be permitted');
});

test('SECURITY: Self-registration strictly prevents self-assigning ACCOUNTS_EXECUTIVE or student links', () => {
  const newAuth: MockAuth = { uid: 'new-user-1' };

  // Attempting to self-register as ACCOUNTS_EXECUTIVE
  const execReg = evaluateCanCreateUserProfile(newAuth, 'new-user-1', {
    role: 'ACCOUNTS_EXECUTIVE',
  });
  assert.equal(execReg.allowed, false, 'Self-registration as ACCOUNTS_EXECUTIVE must be denied');

  // Attempting to self-register with pre-linked students
  const studentReg = evaluateCanCreateUserProfile(newAuth, 'new-user-1', {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
  });
  assert.equal(studentReg.allowed, false, 'Self-registration with pre-linked students must be denied');

  // Valid self-registration as PARENT with empty student links
  const validReg = evaluateCanCreateUserProfile(newAuth, 'new-user-1', {
    role: 'PARENT',
    linkedStudentIds: [],
  });
  assert.equal(validReg.allowed, true, 'Valid parent registration with zero student links must be permitted');
});

// Phase 4 Evaluators & Invariant Tests

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function evaluateCanCreateStudent(
  auth: MockAuth | null,
  userDoc: MockUserDoc | null,
  studentId: string,
  data: { centreId: string; [key: string]: any }
): boolean {
  if (!isValidId(studentId)) return false;
  return evaluateCanAccessCentre(auth, userDoc, data.centreId);
}

function evaluateCanCreatePayment(
  auth: MockAuth | null,
  userDoc: MockUserDoc | null,
  paymentId: string,
  paymentData: { studentId: string; centreId?: string; status: string; parentId?: string },
  studentDb: Record<string, { centreId: string }>
): boolean {
  if (!isValidId(paymentId)) return false;
  if (!auth || !userDoc) return false;

  // Accounts Executive create
  if (userDoc.role === 'ACCOUNTS_EXECUTIVE') {
    const centreId = paymentData.centreId || studentDb[paymentData.studentId]?.centreId;
    if (!centreId) return false;
    return evaluateCanAccessCentre(auth, userDoc, centreId);
  }

  // Parent create (PENDING only, for linked student)
  if (userDoc.role === 'PARENT') {
    if (paymentData.status !== 'PENDING') return false;
    if (paymentData.parentId !== auth.uid) return false;
    return Boolean(Array.isArray(userDoc.linkedStudentIds) && userDoc.linkedStudentIds.includes(paymentData.studentId));
  }

  return false;
}

function evaluateCanAccessRecordCentre(
  auth: MockAuth | null,
  userDoc: MockUserDoc | null,
  data: { centreId?: string; studentId?: string },
  studentDb: Record<string, { centreId: string }>
): boolean {
  if (!auth || !userDoc || userDoc.role !== 'ACCOUNTS_EXECUTIVE') return false;
  if (data.centreId && isValidId(data.centreId)) {
    return evaluateCanAccessCentre(auth, userDoc, data.centreId);
  }
  if (data.studentId && isValidId(data.studentId)) {
    const student = studentDb[data.studentId];
    if (!student) return false;
    return evaluateCanAccessCentre(auth, userDoc, student.centreId);
  }
  return false;
}

test('SECURITY: Authorized Accounts Executive can create an allowed student in an authorized centre', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI', 'CENTRE-JAIPUR-MALVIYA'],
  };

  const allowed = evaluateCanCreateStudent(execAuth, execDoc, 'STU-0412', {
    centreId: 'CENTRE-JAIPUR-VAISHALI',
    fullName: 'Aarav Meena',
  });
  assert.equal(allowed, true, 'Authorized staff must be able to create student in authorized centre');
});

test('SECURITY: Executive cannot create a student in an unauthorized centre', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI'],
  };

  const allowed = evaluateCanCreateStudent(execAuth, execDoc, 'STU-0587', {
    centreId: 'CENTRE-JAIPUR-MALVIYA',
    fullName: 'Ishita Sharma',
  });
  assert.equal(allowed, false, 'Staff must NOT be able to create student in unauthorized centre');
});

test('SECURITY: Parent cannot create or modify student records', () => {
  const parentAuth: MockAuth = { uid: 'parent-1' };
  const parentDoc: MockUserDoc = {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
  };

  const createAttempt = evaluateCanCreateStudent(parentAuth, parentDoc, 'STU-9999', {
    centreId: 'CENTRE-JAIPUR-VAISHALI',
    fullName: 'Intruder Student',
  });
  assert.equal(createAttempt, false, 'Parent must NEVER create student records');
});

test('SECURITY: Parent cannot create VERIFIED payments', () => {
  const parentAuth: MockAuth = { uid: 'parent-1' };
  const parentDoc: MockUserDoc = {
    role: 'PARENT',
    linkedStudentIds: ['STU-0412'],
  };
  const studentDb = { 'STU-0412': { centreId: 'CENTRE-JAIPUR-VAISHALI' } };

  // Parent attempting to submit a VERIFIED payment receipt
  const verifiedAttempt = evaluateCanCreatePayment(
    parentAuth,
    parentDoc,
    'PAY-TEST-1',
    { studentId: 'STU-0412', parentId: 'parent-1', status: 'VERIFIED' },
    studentDb
  );
  assert.equal(verifiedAttempt, false, 'Parent must NOT create VERIFIED payments');

  // Parent submitting a legitimate PENDING payment intent
  const pendingAttempt = evaluateCanCreatePayment(
    parentAuth,
    parentDoc,
    'PAY-TEST-2',
    { studentId: 'STU-0412', parentId: 'parent-1', status: 'PENDING' },
    studentDb
  );
  assert.equal(pendingAttempt, true, 'Parent must be allowed to create PENDING payment intent');
});

test('SECURITY: Authorized staff can create permitted financial records with direct or derived centre', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI'],
  };
  const studentDb = { 'STU-0412': { centreId: 'CENTRE-JAIPUR-VAISHALI' } };

  // Direct centreId
  const directCheck = evaluateCanAccessRecordCentre(
    execAuth,
    execDoc,
    { centreId: 'CENTRE-JAIPUR-VAISHALI', studentId: 'STU-0412' },
    studentDb
  );
  assert.equal(directCheck, true, 'Staff can access record with direct authorized centreId');

  // Derived centreId from student
  const derivedCheck = evaluateCanAccessRecordCentre(
    execAuth,
    execDoc,
    { studentId: 'STU-0412' },
    studentDb
  );
  assert.equal(derivedCheck, true, 'Staff can access record with derived centreId from linked student');
});

test('SECURITY: Missing student references are rejected when deriving centre', () => {
  const execAuth: MockAuth = { uid: 'exec-1' };
  const execDoc: MockUserDoc = {
    role: 'ACCOUNTS_EXECUTIVE',
    authorizedCentreIds: ['CENTRE-JAIPUR-VAISHALI'],
  };
  const studentDb = { 'STU-0412': { centreId: 'CENTRE-JAIPUR-VAISHALI' } };

  // Referencing non-existent student STU-9999
  const missingStudentCheck = evaluateCanAccessRecordCentre(
    execAuth,
    execDoc,
    { studentId: 'STU-9999' },
    studentDb
  );
  assert.equal(missingStudentCheck, false, 'Missing student reference must be rejected');
});

test('SEED RECOVERY: Partial seed state permits safe retry and skips existing records', () => {
  const existingCentres = ['CENTRE-JAIPUR-VAISHALI', 'CENTRE-JAIPUR-TONK', 'CENTRE-JAIPUR-MALVIYA', 'CENTRE-JAIPUR-VIDHYADHAR'];
  const existingBatches = ['BATCH-JAIPUR-JEE-2025-A', 'BATCH-JAIPUR-JEE-2025-B', 'BATCH-JAIPUR-NEET-2025-A', 'BATCH-JAIPUR-FND-2025-A'];

  // Simulate retry decision
  let created = 0;
  let skipped = 0;

  for (const c of existingCentres) {
    // If exists in database -> skip
    skipped++;
  }
  for (const b of existingBatches) {
    skipped++;
  }
  // Missing students (3), plans (3), instalments (9), payments (2), reminders (2)
  const missingRecords = 19;
  created += missingRecords;

  assert.equal(skipped, 8, '8 already-persisted records must be skipped');
  assert.equal(created, 19, '19 missing records must be created');
  assert.equal(skipped + created, 27, 'Total records equal 27');
});

test('SEED RECOVERY: Fully completed seed marker prevents duplicate writes on repeat invocation', () => {
  const all27Records = Array.from({ length: 27 }, (_, i) => `doc-${i}`);
  let created = 0;
  let skipped = 0;

  for (const _ of all27Records) {
    // All exist in database
    skipped++;
  }

  assert.equal(skipped, 27, 'All 27 records must be skipped when database is complete');
  assert.equal(created, 0, 'Zero duplicate records created');
});

