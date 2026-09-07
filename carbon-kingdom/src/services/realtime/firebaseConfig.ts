// Fill this in with your own Firebase project's config to enable REAL
// cross-device classroom multiplayer (students on their own phones/laptops,
// not just tabs on one machine). See SETUP.md "Enabling real multiplayer"
// for the full step-by-step. Leave firebaseConfig as null to keep using the
// local same-device adapter (BroadcastChannel + localStorage) — everything
// in the game works fine without Firebase, this only extends the reach of
// Class Race / Team Battle across separate devices.
export const firebaseConfig: {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  appId: string
} | null = {
  apiKey: 'AIzaSyBYVJdARwT0wC2_MLjMmCFD7iWVQipQeCk',
  authDomain: 'game-education-kanda-v1.firebaseapp.com',
  databaseURL: 'https://game-education-kanda-v1-default-rtdb.firebaseio.com',
  projectId: 'game-education-kanda-v1',
  appId: '1:851238291830:web:1def937ff3b8f216a0d257'
}
