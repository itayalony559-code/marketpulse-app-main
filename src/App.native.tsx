import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DarkTheme, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useContext, useEffect, useMemo, useState, createContext, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { assets } from '@/data/assets';
import { marketIndexes } from '@/data/marketIndexes';
import { news } from '@/data/news';
import type { Asset, NewsArticle, RiskLevel } from '@/types';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const COLORS = {
  background: '#07110D',
  surface: '#101C16',
  raised: '#17261E',
  border: '#263A2F',
  text: '#F2F7F3',
  muted: '#93A59A',
  accent: '#62E6A2',
  negative: '#F18484',
};

const WATCHLIST_KEY = 'marketpulse_watchlist';
const ALERTS_KEY = 'marketpulse_alert_symbols';
const RISK_KEY = 'marketpulse_risk_profile';
const isExpoGo = Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  AssetDetail: { symbol: string };
  NewsDetail: { id: string };
  Upgrade: undefined;
};

type TabParamList = {
  Markets: undefined;
  Explore: undefined;
  Watchlist: undefined;
  Profile: undefined;
};

type AppNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

type NativeData = {
  watchlist: string[];
  toggleWatchlist: (symbol: string) => void;
  alertSymbols: string[];
  toggleAlert: (symbol: string) => void;
  requestNotificationPermission: () => Promise<boolean>;
};

const NativeDataContext = createContext<NativeData | null>(null);

function NativeDataProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState(['NVDA', 'AAPL', 'TSLA']);
  const [alertSymbols, setAlertSymbols] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      AsyncStorage.getItem(WATCHLIST_KEY),
      AsyncStorage.getItem(ALERTS_KEY),
    ]).then(([savedWatchlist, savedAlerts]) => {
      if (!mounted) return;
      if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist) as string[]);
      if (savedAlerts) setAlertSymbols(JSON.parse(savedAlerts) as string[]);
      setReady(true);
    }).catch(() => {
      if (mounted) setReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (ready) void AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [ready, watchlist]);

  useEffect(() => {
    if (ready) void AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(alertSymbols));
  }, [ready, alertSymbols]);

  const toggleWatchlist = useCallback((symbol: string) => {
    setWatchlist((current) => current.includes(symbol)
      ? current.filter((item) => item !== symbol)
      : [...current, symbol]);
  }, []);

  const toggleAlert = useCallback((symbol: string) => {
    setAlertSymbols((current) => current.includes(symbol)
      ? current.filter((item) => item !== symbol)
      : [...current, symbol]);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (isExpoGo) return false;
    try {
      const Notifications = await import('expo-notifications');
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        ({ status } = await Notifications.requestPermissionsAsync());
      }
      return status === 'granted';
    } catch {
      return false;
    }
  }, []);

  const value = useMemo(() => ({
    watchlist,
    toggleWatchlist,
    alertSymbols,
    toggleAlert,
    requestNotificationPermission,
  }), [watchlist, toggleWatchlist, alertSymbols, toggleAlert, requestNotificationPermission]);

  return <NativeDataContext.Provider value={value}>{children}</NativeDataContext.Provider>;
}

function useNativeData() {
  const value = useContext(NativeDataContext);
  if (!value) throw new Error('NativeDataProvider is missing.');
  return value;
}

function formatPrice(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function formatChange(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function Page({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children.toUpperCase()}</Text>;
}

function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingTitle}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function AssetRow({ asset, onPress, trailing }: { asset: Asset; onPress: () => void; trailing?: ReactNode }) {
  return (
    <Pressable style={({ pressed }) => [styles.assetRow, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.assetIdentity}>
        <Text style={styles.symbol}>{asset.symbol}</Text>
        <Text style={styles.assetName} numberOfLines={1}>{asset.name}</Text>
      </View>
      <View style={styles.assetValues}>
        <Text style={styles.price}>{formatPrice(asset.price, asset.currency)}</Text>
        <Text style={[styles.change, asset.changePercent < 0 && styles.negative]}>
          {formatChange(asset.changePercent)}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

function MarketsScreen() {
  const navigation = useNavigation<AppNavigation>();
  return (
    <Page>
      <Eyebrow>MarketPulse / Live market</Eyebrow>
      <PageHeading title="Markets" subtitle="A clear view of today's session." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indexStrip}>
        {marketIndexes.map((index) => (
          <View key={index.symbol} style={styles.indexCard}>
            <Text style={styles.indexName}>{index.name}</Text>
            <Text style={styles.indexValue}>{index.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
            <Text style={[styles.change, index.changePercent < 0 && styles.negative]}>
              {formatChange(index.changePercent)} today
            </Text>
          </View>
        ))}
      </ScrollView>
      <SectionTitle title="Tracked assets" action="View all" onPress={() => navigation.navigate('Explore')} />
      <View style={styles.list}>
        {assets.slice(0, 12).map((asset) => (
          <AssetRow key={asset.symbol} asset={asset} onPress={() => navigation.navigate('AssetDetail', { symbol: asset.symbol })} />
        ))}
      </View>
      <SectionTitle title="Latest headlines" action="See story" onPress={() => navigation.navigate('NewsDetail', { id: news[0].id })} />
      <NewsPreview article={news[0]} onPress={() => navigation.navigate('NewsDetail', { id: news[0].id })} />
    </Page>
  );
}

function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {action && onPress ? <Pressable onPress={onPress}><Text style={styles.actionText}>{action}</Text></Pressable> : null}
    </View>
  );
}

function ExploreScreen() {
  const navigation = useNavigation<AppNavigation>();
  const [query, setQuery] = useState('');
  const filtered = assets.filter((asset) => {
    const value = query.trim().toLowerCase();
    return !value || asset.symbol.toLowerCase().includes(value) || asset.name.toLowerCase().includes(value);
  });
  return (
    <Page>
      <Eyebrow>Discover</Eyebrow>
      <PageHeading title="Explore" subtitle="Find a company by ticker or name." />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search companies"
        placeholderTextColor={COLORS.muted}
        autoCapitalize="characters"
        style={styles.searchInput}
      />
      <View style={styles.list}>
        {filtered.map((asset) => (
          <AssetRow key={asset.symbol} asset={asset} onPress={() => navigation.navigate('AssetDetail', { symbol: asset.symbol })} />
        ))}
      </View>
    </Page>
  );
}

function WatchlistScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { watchlist } = useNativeData();
  const items = watchlist.map((symbol) => assets.find((asset) => asset.symbol === symbol)).filter((asset): asset is Asset => Boolean(asset));
  return (
    <Page>
      <Eyebrow>Your market</Eyebrow>
      <PageHeading title="Watchlist" subtitle={`${items.length} assets saved on this device.`} />
      {items.length ? (
        <View style={styles.list}>
          {items.map((asset) => <AssetRow key={asset.symbol} asset={asset} onPress={() => navigation.navigate('AssetDetail', { symbol: asset.symbol })} />)}
        </View>
      ) : (
        <Text style={styles.emptyText}>Your watchlist is empty. Add an asset from its detail view.</Text>
      )}
    </Page>
  );
}

function ProfileScreen({ session, onUpgrade }: { session: Session; onUpgrade: () => void }) {
  const [level, setLevel] = useState<RiskLevel>('moderate');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const scoreByLevel: Record<RiskLevel, number> = { conservative: 3, moderate: 7, aggressive: 11 };

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(RISK_KEY).then((value) => {
      if (!mounted || !value) return;
      const profile = JSON.parse(value) as { level?: RiskLevel };
      if (profile.level) setLevel(profile.level);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const profile = { level, score: scoreByLevel[level], updatedAt: new Date().toISOString() };
    try {
      await AsyncStorage.setItem(RISK_KEY, JSON.stringify(profile));
      if (supabase) {
        const { error } = await supabase.from('user_profiles').upsert({
          user_id: session.user.id,
          risk_level: level,
          risk_score: scoreByLevel[level],
          updated_at: profile.updatedAt,
        });
        if (error) throw error;
      }
      setSaved(true);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <Eyebrow>Account</Eyebrow>
      <PageHeading title="Risk profile" subtitle={session.user.email ?? 'Signed in with Google'} />
      <Text style={styles.bodyText}>Choose the profile that best describes your investing comfort.</Text>
      <View style={styles.optionList}>
        {(['conservative', 'moderate', 'aggressive'] as RiskLevel[]).map((item) => (
          <Pressable key={item} onPress={() => { setLevel(item); setSaved(false); }} style={[styles.option, level === item && styles.optionSelected]}>
            <Text style={styles.optionTitle}>{item[0].toUpperCase() + item.slice(1)}</Text>
            <Text style={styles.optionDescription}>{item === 'conservative' ? 'Prioritize steadier returns.' : item === 'moderate' ? 'Balance growth with volatility.' : 'Accept greater swings for growth.'}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton title={saving ? 'Saving…' : 'Save profile'} onPress={() => void saveProfile()} disabled={saving} />
      {saved ? <Text style={styles.successText}>Profile saved.</Text> : null}
      <PrimaryButton title="Explore Premium" variant="secondary" onPress={onUpgrade} />
      <PrimaryButton title="Sign out" variant="secondary" onPress={() => { void supabase?.auth.signOut(); }} />
    </Page>
  );
}

function AssetDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'AssetDetail'>) {
  const asset = assets.find((item) => item.symbol === route.params.symbol);
  const { watchlist, toggleWatchlist, alertSymbols, toggleAlert, requestNotificationPermission } = useNativeData();
  const [notice, setNotice] = useState('');

  if (!asset) return <Page><Text style={styles.bodyText}>Asset not found.</Text></Page>;

  const toggleNewsAlert = async () => {
    if (alertSymbols.includes(asset.symbol)) {
      toggleAlert(asset.symbol);
      setNotice('News alert removed.');
      return;
    }
    if (isExpoGo) {
      setNotice('Notifications are unavailable in Expo Go. Use a development build to enable them.');
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      setNotice('Enable notifications in device settings to receive alerts.');
      return;
    }
    toggleAlert(asset.symbol);
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title: `${asset.symbol} news alerts`, body: 'Notifications are enabled for this asset.' },
      trigger: null,
    });
    setNotice('News alert enabled.');
  };

  return (
    <Page>
      <Pressable onPress={() => navigation.goBack()}><Text style={styles.actionText}>‹ Markets</Text></Pressable>
      <Eyebrow>{`${asset.exchange} / ${asset.sector}`}</Eyebrow>
      <Text style={styles.detailSymbol}>{asset.symbol}</Text>
      <Text style={styles.assetName}>{asset.name}</Text>
      <Text style={styles.detailPrice}>{formatPrice(asset.price, asset.currency)}</Text>
      <Text style={[styles.change, asset.changePercent < 0 && styles.negative]}>
        {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)} ({formatChange(asset.changePercent)}) today
      </Text>
      <View style={styles.statsGrid}>
        <Stat label="Previous close" value={formatPrice(asset.previousClose, asset.currency)} />
        <Stat label="Volume" value={asset.volume.toLocaleString('en-US')} />
        <Stat label="Day high" value={formatPrice(asset.high ?? asset.price, asset.currency)} />
        <Stat label="Day low" value={formatPrice(asset.low ?? asset.previousClose, asset.currency)} />
      </View>
      <PrimaryButton title={watchlist.includes(asset.symbol) ? 'Remove from watchlist' : 'Add to watchlist'} variant="secondary" onPress={() => toggleWatchlist(asset.symbol)} />
      <PrimaryButton title={alertSymbols.includes(asset.symbol) ? 'Turn off news alert' : 'Enable news alert'} variant="secondary" onPress={() => void toggleNewsAlert()} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <SectionTitle title="Recent coverage" />
      {news.filter((article) => article.tickers.includes(asset.symbol)).slice(0, 3).map((article) => (
        <NewsPreview key={article.id} article={article} onPress={() => navigation.navigate('NewsDetail', { id: article.id })} />
      ))}
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

function NewsPreview({ article, onPress }: { article: NewsArticle; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.newsCard, pressed && styles.pressed]}>
      <Eyebrow>{`${article.category} / ${article.source}`}</Eyebrow>
      <Text style={styles.newsHeadline}>{article.headline}</Text>
      <Text style={styles.newsSummary} numberOfLines={3}>{article.summary}</Text>
    </Pressable>
  );
}

function NewsDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'NewsDetail'>) {
  const article = news.find((item) => item.id === route.params.id);
  if (!article) return <Page><Text style={styles.bodyText}>Story not found.</Text></Page>;
  return (
    <Page>
      <Pressable onPress={() => navigation.goBack()}><Text style={styles.actionText}>‹ Back</Text></Pressable>
      <Eyebrow>{`${article.category} / ${article.source}`}</Eyebrow>
      <Text style={styles.newsTitle}>{article.headline}</Text>
      <Text style={styles.newsSummary}>{article.summary}</Text>
      {article.body.map((paragraph, index) => <Text key={index} style={styles.bodyText}>{paragraph}</Text>)}
    </Page>
  );
}

function UpgradeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Upgrade'>) {
  return (
    <Page>
      <Pressable onPress={() => navigation.goBack()}><Text style={styles.actionText}>‹ Back</Text></Pressable>
      <Eyebrow>MarketPulse Plus</Eyebrow>
      <PageHeading title="More signal, less noise." subtitle="Premium checkout is not enabled in this build." />
      <View style={styles.indexCard}><Text style={styles.optionTitle}>Monthly</Text><Text style={styles.detailPrice}>$19 / month</Text></View>
      <View style={styles.indexCard}><Text style={styles.optionTitle}>Yearly</Text><Text style={styles.detailPrice}>$190 / year</Text></View>
      <PrimaryButton title="Return to markets" onPress={() => navigation.goBack()} />
    </Page>
  );
}

function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    if (!supabase) {
      setError('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'marketpulse' });
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('Supabase did not return an authorization URL.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) return;
      const callback = new URL(result.url);
      const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
      const code = callback.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else {
        const accessToken = callback.searchParams.get('access_token') ?? fragment.get('access_token');
        const refreshToken = callback.searchParams.get('refresh_token') ?? fragment.get('refresh_token');
        if (!accessToken || !refreshToken) throw new Error('The OAuth callback did not include a session.');
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) throw sessionError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loginPage}>
        <Eyebrow>Independent market intelligence</Eyebrow>
        <Text style={styles.brand}>Market<Text style={styles.brandAccent}>Pulse</Text></Text>
        <Text style={styles.subtitle}>Follow the numbers that move your portfolio.</Text>
        <PrimaryButton title={busy ? 'Connecting…' : 'Continue with Google'} onPress={() => void signIn()} disabled={busy} />
        {busy ? <ActivityIndicator color={COLORS.accent} style={styles.loader} /> : null}
        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>{title}</Text>
    </Pressable>
  );
}

function MainTabs({ session, onUpgrade }: { session: Session; onUpgrade: () => void }) {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: styles.scene,
      }}
    >
      <Tabs.Screen name="Markets" component={MarketsScreen} />
      <Tabs.Screen name="Explore" component={ExploreScreen} />
      <Tabs.Screen name="Watchlist" component={WatchlistScreen} />
      <Tabs.Screen name="Profile">
        {() => <ProfileScreen session={session} onUpgrade={onUpgrade} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

export default function NativeApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    }).catch(() => undefined).finally(() => {
      if (mounted) setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const theme = useMemo(() => ({
    ...DarkTheme,
    colors: { ...DarkTheme.colors, background: COLORS.background, card: COLORS.surface, text: COLORS.text, border: COLORS.border, primary: COLORS.accent },
  }), []);

  if (loading) {
    return <SafeAreaProvider><View style={styles.loading}><ActivityIndicator color={COLORS.accent} /></View></SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <NativeDataProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <NavigationContainer theme={theme}>
          <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: styles.scene }}>
            {session ? (
              <>
                <RootStack.Screen name="Main">
                  {({ navigation }) => <MainTabs session={session} onUpgrade={() => navigation.navigate('Upgrade')} />}
                </RootStack.Screen>
                <RootStack.Screen name="AssetDetail" component={AssetDetailScreen} options={{ headerShown: true, title: 'Asset details', headerTintColor: COLORS.text, headerStyle: styles.header }} />
                <RootStack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ headerShown: true, title: 'Market news', headerTintColor: COLORS.text, headerStyle: styles.header }} />
                <RootStack.Screen name="Upgrade" component={UpgradeScreen} options={{ headerShown: true, title: 'Premium', headerTintColor: COLORS.text, headerStyle: styles.header }} />
              </>
            ) : (
              <RootStack.Screen name="Login" component={LoginScreen} />
            )}
          </RootStack.Navigator>
        </NavigationContainer>
      </NativeDataProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scene: { backgroundColor: COLORS.background },
  page: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 34, gap: 18 },
  heading: { gap: 5 },
  headingTitle: { color: COLORS.text, fontSize: 30, fontWeight: '700' },
  eyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  indexStrip: { gap: 10, paddingRight: 18 },
  indexCard: { minWidth: 170, padding: 15, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  indexName: { color: COLORS.muted, fontSize: 12 },
  indexValue: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  list: { borderTopWidth: 1, borderColor: COLORS.border },
  assetRow: { minHeight: 70, borderBottomWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  assetIdentity: { flex: 1, gap: 4 },
  symbol: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
  assetName: { color: COLORS.muted, fontSize: 12 },
  assetValues: { alignItems: 'flex-end', gap: 5 },
  price: { color: COLORS.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  change: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  negative: { color: COLORS.negative },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionHeading: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  actionText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  newsCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.surface, padding: 15, gap: 9 },
  newsHeadline: { color: COLORS.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  newsSummary: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  searchInput: { height: 48, paddingHorizontal: 14, borderRadius: 9, color: COLORS.text, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 },
  emptyText: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  bodyText: { color: COLORS.muted, fontSize: 15, lineHeight: 23 },
  optionList: { gap: 10 },
  option: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 15, borderRadius: 9, gap: 5 },
  optionSelected: { borderColor: COLORS.accent },
  optionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  optionDescription: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  button: { minHeight: 48, borderRadius: 9, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 },
  buttonSecondary: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  buttonText: { color: COLORS.background, fontSize: 14, fontWeight: '700' },
  buttonTextSecondary: { color: COLORS.text },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
  successText: { color: COLORS.accent, fontSize: 13 },
  errorText: { color: COLORS.negative, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  detailSymbol: { color: COLORS.text, fontSize: 34, fontWeight: '800', marginBottom: -14 },
  detailPrice: { color: COLORS.text, fontSize: 30, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', minHeight: 72, borderRadius: 9, backgroundColor: COLORS.surface, padding: 12, gap: 7 },
  statLabel: { color: COLORS.muted, fontSize: 11 },
  statValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  notice: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  newsTitle: { color: COLORS.text, fontSize: 27, fontWeight: '800', lineHeight: 33 },
  loginPage: { flex: 1, justifyContent: 'center', padding: 26, gap: 16 },
  brand: { color: COLORS.text, fontSize: 42, fontWeight: '800' },
  brandAccent: { color: COLORS.accent },
  loader: { marginTop: 8 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  tabBar: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, height: 62, paddingTop: 6, paddingBottom: 6 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  header: { backgroundColor: COLORS.surface },
});