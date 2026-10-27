import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import type { AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Hero, type HeroClass, type HeroStats } from '@/models/hero';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';

const TOTAL_POINTS = 10;
const CLASSES = ['Warrior', 'Paladin', 'Sorcerer'] as const;
const PORTRAITS = ['🧙🏻‍♂️', '🧝🏼‍♀️', '🧔🏽', '🧙🏼‍♂️', '🧔🏻‍♂️', '🧝🏽‍♂️'];
type StatName = keyof HeroStats;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const [hero, setHero] = useState(() => new Hero());
  const [photo, setPhoto] = useState<string | null>(null);
  const [portrait, setPortrait] = useState(0);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const hoverSound = useRef<AudioPlayer | null>(null);
  const lastSoundAt = useRef(0);
  const audioUnlocked = useRef(false);
  const usedPoints = hero.getTotalPoints() - 4;
  const remaining = TOTAL_POINTS - usedPoints;
  const canGenerate = hero.name.trim().length > 0 && remaining === 0;

  useEffect(() => {
    let mounted = true;
    let player: AudioPlayer | null = null;

    void import('expo-audio').then(({ createAudioPlayer }) => {
      const createdPlayer = createAudioPlayer(require('../../assets/sounds/tick.wav'));
      if (!mounted) {
        createdPlayer.release();
        return;
      }
      player = createdPlayer;
      hoverSound.current = createdPlayer;
    }).catch(() => {
      // Audio is optional if the browser or device cannot initialize a player.
    });

    return () => {
      mounted = false;
      player?.release();
      hoverSound.current = null;
    };
  }, []);

  function playHoverSound() {
    if (Platform.OS === 'web' && !audioUnlocked.current) return;
    playTick();
  }

  function playOnUserAction() {
    audioUnlocked.current = true;
    playTick();
  }

  async function playTick() {
    const player = hoverSound.current;
    if (!player) return;
    const now = Date.now();
    if (now - lastSoundAt.current < 100) return;
    lastSoundAt.current = now;
    try {
      await player.seekTo(0);
      await player.play();
    } catch {
      // Browsers can still reject playback when audio permissions are unavailable.
    }
  }

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  function renderPortrait(item: string, index: number) {
    return (
      <Pressable
        key={index}
        onHoverIn={playHoverSound}
        onPressIn={playOnUserAction}
        onPress={() => { setPortrait(index); setPhoto(null); }}
        style={[styles.portraitTile, portrait === index && !photo && styles.portraitTileSelected]}
        accessibilityLabel={`Select portrait ${index + 1}`}>
        <Text style={styles.portraitEmoji}>{item}</Text>
      </Pressable>
    );
  }

  function changeStat(stat: StatName, amount: number) {
    if ((amount > 0 && remaining === 0) || (amount < 0 && hero.stats[stat] === 1)) return;
    setHero((current) => {
      const updated = current.clone();
      updated.stats[stat] += amount;
      return updated;
    });
    void Haptics.selectionAsync();
  }

  function updateHero<K extends 'name' | 'heroClass'>(key: K, value: Hero[K]) {
    setHero((current) => {
      const updated = current.clone();
      updated[key] = value;
      return updated;
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.stoneHeader}>
        <Text style={styles.title}>Create your hero</Text>
        <Text style={styles.subtitle}>Choose your adventurer</Text>
      </View>

      <View style={[styles.gameLayout, isWide && styles.gameLayoutWide]}>
        <View style={[styles.leftColumn, isWide && styles.leftColumnWide]}>
          <View style={styles.stoneSign}><Text style={styles.signTitle}>CHARACTER</Text><Text style={styles.signTitle}>GENERATION</Text></View>
          <Text style={[styles.label, styles.portraitLabel]}>SELECT PORTRAIT</Text>
          <View style={styles.portraitGrid}>
            <View style={styles.portraitRow}>{PORTRAITS.slice(0, 3).map(renderPortrait)}</View>
            <View style={styles.portraitRow}>{PORTRAITS.slice(3, 6).map((item, index) => renderPortrait(item, index + 3))}</View>
          </View>
          <Pressable onHoverIn={playHoverSound} onPressIn={playOnUserAction} onPress={choosePhoto} style={styles.uploadButton}><Text style={styles.uploadText}>{photo ? 'CHANGE PHOTO' : '＋ ADD YOUR PHOTO'}</Text></Pressable>
        </View>

        <View style={[styles.rightColumn, isWide && styles.rightColumnWide]}>
          <View style={styles.statsHeading}>
            <View style={styles.miniPortrait}>{photo ? <Image source={{ uri: photo }} style={styles.miniPhoto} /> : <Text style={styles.miniEmoji}>{PORTRAITS[portrait]}</Text>}</View>
            <View style={styles.nameAndClass}>
              <TextInput accessibilityLabel="Hero name" value={hero.name} onFocus={playOnUserAction} onChangeText={(value) => updateHero('name', value)} placeholder="HERO NAME" placeholderTextColor="#9A3D0D" style={styles.input} maxLength={24} />
              <Pressable onHoverIn={playHoverSound} onPressIn={playOnUserAction} onPress={() => setShowClassPicker(true)} style={styles.classDropdown} accessibilityRole="button" accessibilityLabel="Choose hero class">
                <Text style={styles.classDropdownText}>{hero.heroClass.toUpperCase()}</Text><Text style={styles.dropdownArrow}>▾</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.statsHeading}>
            <Text style={styles.panelTitle}>ALLOCATE POINTS</Text>
            <Text style={styles.points}>{remaining}<Text style={styles.pointsSmall}> LEFT</Text></Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(remaining / TOTAL_POINTS) * 100}%`, backgroundColor: remaining <= 2 ? '#F42B18' : '#70B84A' }]} /></View>
          {(Object.keys(hero.stats) as StatName[]).map((stat) => (
            <View key={stat} style={styles.statRow}>
              <Text style={styles.statAbbr}>{stat.toUpperCase()}</Text>
              <Pressable onHoverIn={playHoverSound} onPressIn={playOnUserAction} onPress={() => changeStat(stat, -1)} style={styles.stepButton} accessibilityLabel={`Decrease ${stat}`}><Text style={styles.stepText}>−</Text></Pressable>
              <Text style={styles.statValue}>{hero.stats[stat]}</Text>
              <Pressable onHoverIn={playHoverSound} onPressIn={playOnUserAction} onPress={() => changeStat(stat, 1)} style={styles.stepButton} accessibilityLabel={`Increase ${stat}`}><Text style={styles.stepText}>+</Text></Pressable>
            </View>
          ))}
          <View style={styles.totalRow}><Text style={styles.totalText}>POINTS SPENT</Text><Text style={styles.totalValue}>{usedPoints} / {TOTAL_POINTS}</Text></View>
        </View>
      </View>

      <Pressable
        onHoverIn={playHoverSound}
        onPressIn={canGenerate ? playOnUserAction : undefined}
        disabled={!canGenerate}
        onPress={() => setShowSummary(true)}
        style={[styles.generateButton, !canGenerate && styles.generateDisabled]}>
        <Text style={[styles.generateText, !canGenerate && styles.generateTextDisabled]}>Generate hero</Text>
        <Text style={[styles.generateArrow, !canGenerate && styles.generateTextDisabled]}>→</Text>
      </Pressable>
      {!canGenerate && <Text style={styles.validation}>Enter a name and use all 10 points to continue.</Text>}

      <Modal visible={showClassPicker} animationType="fade" transparent onRequestClose={() => setShowClassPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowClassPicker(false)}>
          <View style={styles.classPickerCard}>
            <Text style={styles.classPickerTitle}>CHOOSE CLASS</Text>
            {CLASSES.map((item) => (
              <Pressable key={item} onHoverIn={playHoverSound} onPressIn={playOnUserAction} onPress={() => { updateHero('heroClass', item as HeroClass); setShowClassPicker(false); }} style={[styles.classOption, hero.heroClass === item && styles.classOptionSelected]}>
                <Text style={styles.classOptionText}>{item.toUpperCase()}</Text>
                {hero.heroClass === item && <Text style={styles.classOptionCheck}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showSummary} animationType="slide" transparent onRequestClose={() => setShowSummary(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Pressable onPress={() => setShowSummary(false)} style={styles.closeButton} accessibilityLabel="Close summary"><Text style={styles.closeText}>×</Text></Pressable>
            {photo ? <Image source={{ uri: photo }} style={styles.summaryAvatar} /> : <View style={styles.summaryPlaceholder}><Text style={styles.summaryPortrait}>{PORTRAITS[portrait]}</Text></View>}
            <Text style={styles.eyebrow}>HERO GENERATED</Text>
            <Text style={styles.summaryName}>{hero.name.trim()}</Text>
            <Text style={styles.summaryClass}>{hero.heroClass}</Text>
            <View style={styles.summaryStats}>
              {(Object.keys(hero.stats) as StatName[]).map((stat) => <View key={stat} style={styles.summaryStat}><Text style={styles.summaryStatValue}>{hero.stats[stat]}</Text><Text style={styles.summaryStatName}>{stat}</Text></View>)}
            </View>
            <Pressable onPress={() => setShowSummary(false)} style={styles.doneButton}><Text style={styles.doneText}>Back to workshop</Text></Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#090909', paddingHorizontal: 18, paddingTop: 54, paddingBottom: 38 },
  stoneHeader: { backgroundColor: '#45484A', borderWidth: 4, borderColor: '#8B8D87', padding: 18, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 0, elevation: 5 },
  eyebrow: { color: '#FFD22E', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, textAlign: 'center' },
  title: { color: '#F5EAD0', fontSize: 28, fontWeight: '900', marginTop: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  subtitle: { color: '#D0CBC1', fontSize: 12, marginTop: 6, textAlign: 'center' },
  gameLayout: { gap: 15 }, gameLayoutWide: { flexDirection: 'row', alignItems: 'stretch' }, leftColumn: { backgroundColor: '#555653', borderWidth: 5, borderColor: '#92938D', padding: 13 }, leftColumnWide: { width: '34%' }, rightColumn: { backgroundColor: '#F66B0C', borderWidth: 5, borderColor: '#A83808', padding: 14 }, rightColumnWide: { flex: 1 },
  stoneSign: { backgroundColor: '#101010', borderWidth: 4, borderColor: '#E7A10A', paddingVertical: 10, alignItems: 'center', marginBottom: 12 }, signSmall: { color: '#F5B627', fontSize: 9, fontWeight: '900', letterSpacing: 2 }, signTitle: { color: '#F1E7D0', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  panelTitle: { color: '#4D1808', fontSize: 13, fontWeight: '900', letterSpacing: 1.4 },
  portraitGrid: { width: '100%', maxWidth: 210, alignSelf: 'center', borderWidth: 3, borderColor: '#E7A10A', borderRadius: 4, backgroundColor: '#151515', padding: 3 },
  portraitRow: { flexDirection: 'row' },
  portraitTile: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', backgroundColor: '#211B17', borderWidth: 2, borderColor: '#5E5E58' }, portraitTileSelected: { borderColor: '#FFD52F', backgroundColor: '#493018' }, portraitEmoji: { fontSize: 28, textAlign: 'center', textAlignVertical: 'center' },
  uploadButton: { backgroundColor: '#22221F', borderWidth: 2, borderColor: '#D5990A', paddingVertical: 10, marginTop: 10, alignItems: 'center' }, uploadText: { color: '#F2C544', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  miniPortrait: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18120F', borderWidth: 3, borderColor: '#A93808', marginRight: 10 }, miniPhoto: { width: '100%', height: '100%' }, miniEmoji: { fontSize: 36 }, nameAndClass: { flex: 1 }, classRow: { flexDirection: 'row', gap: 4 },
  portrait: { width: '100%', height: '100%' }, portraitPlaceholder: { flex: 1, backgroundColor: '#30251E', alignItems: 'center', justifyContent: 'center' }, portraitGlyph: { color: '#F2A21A', fontSize: 46 },
  label: { color: '#F6C02A', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 7, marginTop: 8, },
  portraitLabel: { textAlign: 'center' },
  input: { height: 44, backgroundColor: '#181611', borderWidth: 2, borderColor: '#E8A10C', color: '#FFF0B8', paddingHorizontal: 11, fontSize: 14, marginBottom: 10 },
  classDropdown: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: '#302015', borderWidth: 2, borderColor: '#FFD52F' }, classDropdownText: { color: '#F4E4AC', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, dropdownArrow: { color: '#F1301B', fontSize: 17, fontWeight: '900' },
  classPickerCard: { width: '100%', maxWidth: 340, alignSelf: 'center', backgroundColor: '#F66B0C', borderWidth: 5, borderColor: '#E99B0B', padding: 18 }, classPickerTitle: { color: '#511806', fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 12, letterSpacing: 1.5 }, classOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#35190E', borderWidth: 2, borderColor: '#963B0A', marginTop: 7 }, classOptionSelected: { backgroundColor: '#10240B', borderColor: '#FFD52F' }, classOptionText: { color: '#FFE6B0', fontSize: 13, fontWeight: '900', letterSpacing: 1 }, classOptionCheck: { color: '#F5261A', fontWeight: '900', fontSize: 18 },
  classSelected: { backgroundColor: '#10230A', borderColor: '#FFD52F' }, classText: { color: '#E8A02B', fontSize: 12, fontWeight: '900', letterSpacing: 1 }, classTextSelected: { color: '#F4E4AC' },
  photoHint: { color: '#E1A62D', fontSize: 9, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  statsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, sectionHint: { color: '#7B2607', fontSize: 10, marginTop: 3, fontWeight: '700' }, points: { color: '#A50000', fontSize: 22, fontWeight: '900' }, pointsSmall: { color: '#831B06', fontSize: 9, fontWeight: '900' },
  progressTrack: { height: 9, borderWidth: 2, borderColor: '#7F2607', backgroundColor: '#9A3B0A', overflow: 'hidden', marginBottom: 9 }, progressFill: { height: '100%' },
  statRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#B64B0A', paddingVertical: 8 }, statAbbr: { flex: 1, color: '#8D1D05', fontSize: 13, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 0.7 }, stepButton: { width: 34, height: 34, backgroundColor: '#12240B', borderWidth: 2, borderColor: '#7D2707', alignItems: 'center', justifyContent: 'center' }, stepText: { color: '#F1301B', fontSize: 21, fontWeight: '900' }, statValue: { width: 35, textAlign: 'center', color: '#501607', fontSize: 17, fontWeight: '900' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 11 }, totalText: { color: '#6E2108', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, totalValue: { color: '#6E2108', fontSize: 12, fontWeight: '900' },
  generateButton: { height: 53, borderRadius: 0, backgroundColor: '#10240B', borderWidth: 3, borderColor: '#E99B0B', marginTop: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }, generateDisabled: { backgroundColor: '#24231D', borderColor: '#60503A' }, generateText: { color: '#F5261A', fontSize: 15, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' }, generateTextDisabled: { color: '#777064' }, generateArrow: { color: '#F5261A', fontSize: 18, marginLeft: 9 }, validation: { color: '#9B8F7C', textAlign: 'center', fontSize: 10, marginTop: 9 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', padding: 22 }, modalCard: { alignItems: 'center', backgroundColor: '#F66B0C', borderWidth: 5, borderColor: '#A83808', padding: 23 }, closeButton: { position: 'absolute', top: 6, right: 10, zIndex: 1, padding: 5 }, closeText: { color: '#501607', fontSize: 26 }, summaryAvatar: { width: 100, height: 100, borderWidth: 4, borderColor: '#FFD52F', marginTop: 10, marginBottom: 18 }, summaryPlaceholder: { width: 100, height: 100, marginTop: 10, marginBottom: 18, backgroundColor: '#30251E', alignItems: 'center', justifyContent: 'center' }, summaryPortrait: { fontSize: 52 }, photoIcon: { color: '#F2A21A', fontSize: 24 }, summaryName: { color: '#401607', fontSize: 25, fontWeight: '900', marginTop: 8, textTransform: 'uppercase' }, summaryClass: { color: '#8D1D05', fontSize: 13, marginTop: 4, fontWeight: '900' }, summaryStats: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between', marginTop: 22, paddingVertical: 16, borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#B64B0A' }, summaryStat: { alignItems: 'center' }, summaryStatValue: { color: '#401607', fontSize: 20, fontWeight: '900' }, summaryStatName: { color: '#7B2607', fontSize: 9, marginTop: 4, textTransform: 'uppercase', fontWeight: '900' }, doneButton: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: '#10240B', borderWidth: 2, borderColor: '#E99B0B', paddingVertical: 14, marginTop: 18 }, doneText: { color: '#F5261A', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
});
