import { ClerkProvider, useAuth, useOAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import { BarChart3, Check, Crown, Globe, MessageSquareText, Search, Star, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LANGUAGES, type Language } from './i18n/translations';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const BACKGROUND = '#08090C';
const ACCENT = '#00FF88';
const SURFACE_ALT = '#111827';
const BORDER = '#253042';
const OAUTH_REDIRECT_URL = makeRedirectUri({ path: 'oauth-native-callback' });
const APP_USAGE_KEY = 'marketpulse_app_usage_seconds';
const SUBSCRIPTION_KEY = 'marketpulse_subscription_plan';
const FEEDBACK_KEY = 'marketpulse_feedback_entries';
const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/test_00g7uEdrZcQJgDk8xx';
const STRIPE_PORTAL_URL = 'https://billing.stripe.com/p/login/test_4gw3fP1Da6JrgDk8xx';
const HIDE_WEB_APP_HEADER = `
  (function () {
    var root = document.documentElement;
    if (!root) return true;

    function hideHeader() {
      root.querySelectorAll('header').forEach(function (header) {
        header.style.setProperty('display', 'none', 'important');
      });
    }

    hideHeader();
    if (!root.hasAttribute('data-marketpulse-native-header-observer')) {
      root.setAttribute('data-marketpulse-native-header-observer', 'true');
      new MutationObserver(hideHeader).observe(root, { childList: true, subtree: true });
    }
  })();
  true;
`;

export default function NativeApp() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    if (__DEV__) {
      return <NativeAppDevelopmentFallback />;
    }
    throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required.');
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <NativeAppContent />
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

function NativeAppDevelopmentFallback() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={BACKGROUND} />
        <WebView
          source={{ uri: 'https://marketpulse-app-main.vercel.app' }}
          style={styles.webView}
          containerStyle={styles.webViewContainer}
          javaScriptEnabled
          domStorageEnabled
          injectedJavaScriptBeforeContentLoaded={HIDE_WEB_APP_HEADER}
          injectedJavaScript={HIDE_WEB_APP_HEADER}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={ACCENT} />
            </View>
          )}
        />
      </View>
    </SafeAreaProvider>
  );
}

function NativeAppContent() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [usageSeconds, setUsageSeconds] = useState(0);
  const [plan, setPlan] = useState<'free' | 'premium'>('free');
  const startedAtRef = useRef<number | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    let active = true;
    let baselineUsage = 0;
    let sessionStart = 0;
    let interval: ReturnType<typeof setInterval> | undefined;

    const loadUsage = async () => {
      try {
        const storedUsage = await AsyncStorage.getItem(APP_USAGE_KEY);
        const storedPlan = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
        const parsedUsage = Number(storedUsage ?? '0');
        baselineUsage = Number.isFinite(parsedUsage) ? parsedUsage : 0;
        if (active) {
          setUsageSeconds(baselineUsage);
          setPlan(storedPlan === 'premium' ? 'premium' : 'free');
        }
      } catch {
        if (active) {
          setUsageSeconds(0);
          setPlan('free');
        }
      }

      sessionStart = Date.now();
      startedAtRef.current = sessionStart;
      interval = setInterval(() => {
        if (!active) {
          return;
        }
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - sessionStart) / 1000));
        setUsageSeconds(baselineUsage + elapsedSeconds);
      }, 1000);
    };

    void loadUsage();

    return () => {
      active = false;
      if (interval) {
        clearInterval(interval);
      }
      if (startedAtRef.current) {
        const elapsed = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
        void AsyncStorage.setItem(APP_USAGE_KEY, String(Math.max(0, baselineUsage + elapsed)));
      }
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError('');
    try {
      await signOut();
    } catch (caught) {
      setSignOutError(caught instanceof Error ? caught.message : 'Sign-out failed.');
    } finally {
      setSigningOut(false);
    }
  };

  const handleUpgrade = async () => {
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, 'premium');
    setPlan('premium');
    await Linking.openURL(STRIPE_CHECKOUT_URL);
  };

  const handleManageSubscription = async () => {
    await Linking.openURL(STRIPE_PORTAL_URL);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BACKGROUND} />
      {!isLoaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : isSignedIn ? (
        <SafeAreaView style={styles.webViewSafeArea} edges={['top', 'right', 'bottom', 'left']}>
          <View style={styles.authToolbar}>
            <View style={styles.headerBrand}>
              <View style={styles.headerBrandMark}>
                <BarChart3 size={18} color={BACKGROUND} strokeWidth={2.5} />
              </View>
              <View style={styles.headerBrandCopy}>
                <Text style={styles.headerBrandName}>MarketPulse</Text>
                <Text style={styles.headerBrandSubtitle}>MARKET INTELLIGENCE</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select language"
                onPress={() => setLanguageModalVisible(true)}
                style={({ pressed }) => [styles.headerIconButton, pressed && styles.buttonPressed]}
              >
                <Globe size={17} color="#C4CAD6" />
                <Text style={styles.languageFlag}>
                  {LANGUAGES.find((item) => item.code === language)?.flag ?? '🌐'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search markets"
                onPress={() =>
                  webViewRef.current?.injectJavaScript(
                    "window.location.href = window.location.origin + '/explore'; true;",
                  )
                }
                style={({ pressed }) => [styles.headerIconButton, pressed && styles.buttonPressed]}
              >
                <Search size={18} color="#C4CAD6" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                onPress={() => setProfileModalVisible(true)}
                style={styles.profileTrigger}
              >
                {user?.imageUrl ? (
                  <Image source={{ uri: user.imageUrl }} style={styles.profileAvatar} />
                ) : (
                  <View style={styles.profileAvatarFallback}>
                    <Text style={styles.profileAvatarFallbackText}>
                      {getInitials(user?.fullName ?? 'MarketPulse User')}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://marketpulse-app-main.vercel.app' }}
            style={styles.webView}
            containerStyle={styles.webViewContainer}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            injectedJavaScriptBeforeContentLoaded={HIDE_WEB_APP_HEADER}
            injectedJavaScript={HIDE_WEB_APP_HEADER}
            onLoadEnd={() => webViewRef.current?.injectJavaScript(HIDE_WEB_APP_HEADER)}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={ACCENT} />
              </View>
            )}
          />
          <Modal
            visible={languageModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setLanguageModalVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setLanguageModalVisible(false)}>
              <View style={styles.languageBackdrop} />
            </TouchableWithoutFeedback>
            <View style={styles.languageModalContainer}>
              <View style={styles.languageModalCard}>
                <Text style={styles.languageModalTitle}>Choose language</Text>
                {LANGUAGES.map((item) => (
                  <Pressable
                    key={item.code}
                    accessibilityRole="button"
                    onPress={() => {
                      setLanguage(item.code);
                      setLanguageModalVisible(false);
                      webViewRef.current?.injectJavaScript(
                        `window.localStorage.setItem('marketpulse_language', ${JSON.stringify(item.code)}); window.location.reload(); true;`,
                      );
                    }}
                    style={({ pressed }) => [
                      styles.languageOption,
                      item.code === language && styles.languageOptionSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.languageOptionText}>
                      {item.flag}  {item.label}
                    </Text>
                    {item.code === language ? <Check size={16} color={ACCENT} /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          </Modal>
          <ProfileModal
            visible={profileModalVisible}
            onClose={() => setProfileModalVisible(false)}
            user={user}
            plan={plan}
            usageSeconds={usageSeconds}
            onUpgrade={handleUpgrade}
            onManageSubscription={handleManageSubscription}
            onSignOut={() => void handleSignOut()}
            signingOut={signingOut}
            signOutError={signOutError}
          />
        </SafeAreaView>
      ) : (
        <LoginScreen />
      )}
    </View>
  );
}

function ProfileModal({
  visible,
  onClose,
  user,
  plan,
  usageSeconds,
  onUpgrade,
  onManageSubscription,
  onSignOut,
  signingOut,
  signOutError,
}: {
  visible: boolean;
  onClose: () => void;
  user?: ReturnType<typeof useUser>['user'];
  plan: 'free' | 'premium';
  usageSeconds: number;
  onUpgrade: () => Promise<void>;
  onManageSubscription: () => Promise<void>;
  onSignOut: () => Promise<void> | void;
  signingOut: boolean;
  signOutError: string;
}) {
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const userName = user?.fullName || 'MarketPulse User';
  const userEmail = user?.primaryEmailAddress?.emailAddress || 'you@marketpulse.app';
  const avatarSource = user?.imageUrl ? { uri: user.imageUrl } : null;

  const handleSubmitFeedback = async () => {
    setSubmittingFeedback(true);
    try {
      const payload = {
        rating,
        comment: comment.trim(),
        userName,
        userEmail,
        createdAt: new Date().toISOString(),
      };

      const previous = (await AsyncStorage.getItem(FEEDBACK_KEY)) ?? '[]';
      const entries = JSON.parse(previous) as Record<string, unknown>[];
      await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify([...entries, payload]));
      console.log('MarketPulse feedback saved locally:', payload);
      setFeedbackSubmitted(true);
      setComment('');
      setRating(5);
      setTimeout(() => {
        setFeedbackMode(false);
        setFeedbackSubmitted(false);
      }, 900);
    } catch {
      setFeedbackSubmitted(false);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop} />
      </TouchableWithoutFeedback>
      <View style={styles.modalContainer}>
        <View style={styles.modalCard}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close profile" onPress={onClose} style={styles.closeButton}>
            <X size={18} color="#DCE3F0" />
          </Pressable>

          <View style={styles.userRow}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarFallback}>
                <Text style={styles.userAvatarFallbackText}>{getInitials(userName)}</Text>
              </View>
            )}
            <View style={styles.userHeaderText}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Account</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>{plan === 'premium' ? 'Premium / News+' : 'Free Plan'}</Text>
              {plan === 'premium' ? (
                <View style={styles.activeMemberBadge}>
                  <Check size={12} color="#08120A" />
                  <Text style={styles.activeMemberBadgeText}>Active Member</Text>
                </View>
              ) : null}
            </View>
            {plan === 'premium' ? (
              <Pressable style={styles.primaryButton} onPress={() => void onManageSubscription()}>
                <Text style={styles.primaryButtonText}>Manage Subscription</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={() => void onUpgrade()}>
                <Crown size={16} color="#08120A" />
                <Text style={styles.primaryButtonText}>Upgrade to Premium</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Time Spent</Text>
            <Text style={styles.metricValue}>{formatUsage(usageSeconds)}</Text>
            <Text style={styles.metricSubtitle}>זמן באפליקציה</Text>
          </View>

          {!feedbackMode ? (
            <Pressable style={styles.feedbackButton} onPress={() => setFeedbackMode(true)}>
              <MessageSquareText size={16} color="#E5ECFF" />
              <Text style={styles.feedbackButtonText}>Leave Feedback</Text>
            </Pressable>
          ) : (
            <View style={styles.feedbackForm}>
              <Text style={styles.feedbackTitle}>Your feedback</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable key={value} onPress={() => setRating(value)} style={styles.starButton}>
                    <Star
                      size={22}
                      color={value <= rating ? '#F9B449' : '#475569'}
                      fill={value <= rating ? '#F9B449' : 'transparent'}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Tell us what you think..."
                placeholderTextColor="#7C8AA6"
                multiline
                numberOfLines={4}
                style={styles.feedbackInput}
              />
              <View style={styles.feedbackActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setFeedbackMode(false)}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitButton, submittingFeedback && styles.submitButtonDisabled]}
                  onPress={() => void handleSubmitFeedback()}
                  disabled={submittingFeedback}
                >
                  <Text style={styles.submitButtonText}>
                    {submittingFeedback ? 'Sending...' : feedbackSubmitted ? 'Sent' : 'Send'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {signOutError ? (
            <Text accessibilityRole="alert" style={styles.signOutError}>
              {signOutError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={() => void onSignOut()}
            style={({ pressed }) => [
              styles.signOutButton,
              (pressed || signingOut) && styles.buttonPressed,
              styles.profileSignOut,
            ]}
          >
            {signingOut ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            <Text style={styles.signOutButtonText}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      const { createdSessionId, setActive, authSessionResult } = await startOAuthFlow({
        redirectUrl: OAUTH_REDIRECT_URL,
      });
      if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
        return;
      }
      if (!createdSessionId) {
        throw new Error('Google sign-in did not create a Clerk session.');
      }
      if (!setActive) {
        throw new Error('Clerk could not activate the Google sign-in session.');
      }
      await setActive({ session: createdSessionId });
    } catch (caught) {
      console.error('Google sign-in failed:', caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loginContent}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <BarChart3 size={21} color={BACKGROUND} strokeWidth={2.5} />
          </View>
          <Text style={styles.brandName}>MarketPulse</Text>
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.eyebrow}>SECURE ACCESS</Text>
          <Text style={styles.title}>Sign in to MarketPulse</Text>
          <Text style={styles.description}>
            Sign in to continue to your markets, news, and investor profile.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            disabled={busy}
            onPress={() => void signInWithGoogle()}
            style={({ pressed }) => [
              styles.googleButton,
              (pressed || busy) && styles.buttonPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#171717" />
            ) : (
              <Text style={styles.googleMark}>G</Text>
            )}
            <Text style={styles.googleButtonText}>
              {busy ? 'Connecting…' : 'Continue with Google'}
            </Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            Not financial advice. For informational purposes only.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .trim() || 'MP';
}

function formatUsage(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webView: {
    flex: 1,
    width: '100%',
    backgroundColor: BACKGROUND,
  },
  webViewSafeArea: {
    flex: 1,
    backgroundColor: '#0C1017',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  authToolbar: {
    minHeight: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#0C1017',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#273142',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  headerBrandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrandCopy: {
    justifyContent: 'center',
  },
  headerBrandName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  headerBrandSubtitle: {
    marginTop: 3,
    color: '#8791A2',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#293244',
    backgroundColor: '#151B26',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  languageFlag: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  profileTrigger: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D3342',
    backgroundColor: '#111827',
  },
  profileAvatar: {
    width: 38,
    height: 38,
  },
  profileAvatarFallback: {
    width: 38,
    height: 38,
    backgroundColor: '#00FF88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarFallbackText: {
    color: '#06110C',
    fontSize: 12,
    fontWeight: '700',
  },
  languageBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(3, 4, 6, 0.72)',
  },
  languageModalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  languageModalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE_ALT,
  },
  languageModalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  languageOption: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageOptionSelected: {
    backgroundColor: '#00FF8817',
  },
  languageOptionText: {
    color: '#E2E8F0',
    fontSize: 14,
  },
  signOutButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D3342',
    backgroundColor: '#151821',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  signOutError: {
    marginTop: 12,
    color: '#EA3943',
    fontSize: 12,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(3, 4, 6, 0.72)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderColor: '#243044',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#172236',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    marginBottom: 18,
  },
  userAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#00FF88',
  },
  userAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#00FF88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarFallbackText: {
    color: '#08120A',
    fontWeight: '700',
    fontSize: 18,
  },
  userHeaderText: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  userEmail: {
    color: '#9FAAC2',
    fontSize: 13,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#111827',
    borderColor: '#243044',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  statusLabel: {
    color: '#8FA3B8',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  activeMemberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#00FF88',
    gap: 6,
  },
  activeMemberBadgeText: {
    color: '#08120A',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#00FF88',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#08120A',
    fontSize: 14,
    fontWeight: '700',
  },
  metricCard: {
    marginTop: 18,
    backgroundColor: '#0B1320',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#243044',
    padding: 16,
  },
  metricTitle: {
    color: '#9AA8BD',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  metricSubtitle: {
    color: '#8FA3B8',
    fontSize: 12,
    marginTop: 4,
  },
  feedbackButton: {
    marginTop: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#32415D',
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  feedbackButtonText: {
    color: '#E5ECFF',
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackForm: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#243044',
    padding: 14,
  },
  feedbackTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  starButton: {
    padding: 2,
  },
  feedbackInput: {
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E3A4D',
    backgroundColor: '#09111C',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F4F7FF',
    textAlignVertical: 'top',
  },
  feedbackActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2E3A4D',
    backgroundColor: '#0B1320',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#E5ECFF',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#00FF88',
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#08120A',
    fontSize: 13,
    fontWeight: '700',
  },
  profileSignOut: {
    marginTop: 18,
  },
  loginContent: {
    width: '100%',
    maxWidth: 384,
    alignSelf: 'center',
    gap: 32,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 11,
    elevation: 5,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  loginCard: {
    padding: 24,
    borderWidth: 1,
    borderColor: '#202820',
    borderRadius: 12,
    backgroundColor: '#0D0D0D',
  },
  eyebrow: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  title: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  description: {
    color: '#94A3B8',
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  googleButton: {
    minHeight: 48,
    marginTop: 24,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  googleMark: {
    color: '#4285F4',
    fontSize: 17,
    fontWeight: '800',
  },
  googleButtonText: {
    color: '#171717',
    fontSize: 13,
    fontWeight: '700',
  },
  disclaimer: {
    color: '#64748B',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
  },
});
