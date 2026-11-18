import * as WebBrowser from 'expo-web-browser';

export const PRIVACY_POLICY_URL = 'https://saucescode.github.io/siaMeal-Snap/privacy-policy.html';

export function openPrivacyPolicy() {
  WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch((err: unknown) => {
    console.warn('Could not open the privacy policy:', err);
  });
}
