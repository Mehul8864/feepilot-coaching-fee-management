/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase Smoke Test & Audit Probe
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './config';

export async function runSmokeTest() {
  console.log('[SmokeTest] Initializing Firebase audit probe...');
  console.log('[SmokeTest] Auth App Name:', auth.app.name);

  // Probe 1: Public Health Probe Read
  const healthRef = doc(db, '_health', 'connection');
  try {
    const snap = await getDoc(healthRef);
    console.log('[SmokeTest Probe 1] Public health read successful. Document exists:', snap.exists());
  } catch (err: any) {
    console.error('[SmokeTest Probe 1] Unexpected error on public health read:', err.message);
  }

  // Probe 2: Unauthenticated Write (Must be REJECTED by security rules)
  try {
    await setDoc(healthRef, { probeTime: new Date().toISOString() });
    console.error('[SmokeTest Probe 2] SECURITY VIOLATION: Unauthenticated write was allowed!');
  } catch (err: any) {
    console.log('[SmokeTest Probe 2] PASSED: Unauthenticated write blocked as expected:', err.code || err.message);
  }

  // Probe 3: Unauthenticated Read on Protected Student Record (Must be REJECTED by security rules)
  const studentRef = doc(db, 'students', 'STU-0412');
  try {
    await getDoc(studentRef);
    console.error('[SmokeTest Probe 3] SECURITY VIOLATION: Unauthenticated student read was allowed!');
  } catch (err: any) {
    console.log('[SmokeTest Probe 3] PASSED: Unauthenticated student read blocked as expected:', err.code || err.message);
  }
}

runSmokeTest()
  .then(() => {
    console.log('[SmokeTest] Audit probe execution finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[SmokeTest] Error during audit probe:', err);
    process.exit(1);
  });
