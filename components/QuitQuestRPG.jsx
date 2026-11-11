import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sprite from './Sprite';
import SpriteBackground from './SpriteBackground';
import Panel from './ui/Panel';
import Button from './ui/Button';
import ProgressBar from './ui/ProgressBar';
import { GreeningProvider, greeningStage } from './ui/Greening';
import BattleField from './battle/BattleField';
import JourneyMap from './map/JourneyMap';
import OverworldMap from './map/OverworldMap';
import { buildJourneyLayout } from '../lib/journey/layout';
import { REGIONS } from '../lib/journey/regions';
import { useEntitlements } from './premium/EntitlementProvider';
import { PremiumGate, AdvancedStats, SavingsProjections, SkinPicker, SAMPLE_STATS, SAMPLE_SAVINGS } from './premium/PremiumFeatures';
import PremiumScreen from './premium/PremiumScreen';
import { AdSlot, useAds } from './ads/AdsProvider';
import { advancedStats, savingsProjection, logBattle } from '../lib/premium/insights';
import { premiumChaptersFor } from '../lib/premium/story';
import { skinManifestUrl } from '../lib/premium/skins';
import { loadSkinManifest } from '../lib/sprites/SpriteProvider';
import BattleView from './battle/BattleView';
import BattleCamp from './battle/BattleCamp';
import SupportPanel from './battle/SupportPanel';
import useBattleFx from './battle/useBattleFx';
import { createBattle, isOver } from '../lib/battle/engine';
import { ENEMIES, TIER_POOLS } from '../lib/battle/data/enemies';
import { pickEnemy } from '../lib/battle/select';
import { battleRewards } from '../lib/battle/rewards';
import { devMockControls } from './premium/EntitlementProvider';
import { env as qqEnv } from '../lib/monetization/env';
import { deleteLocalData } from '../lib/account/deleteAccount';
import { defaultRegistry } from '../lib/sprites/SpriteProvider';
import { preloadSprites } from '../lib/sprites/preload';

const REGION_IDS = REGIONS.map(r => r.id);

// Inline icon: a manifest sprite sitting on the text line.
const Icon = ({ id, scale = 1, className = '' }) => (
  <Sprite id={id} scale={scale} className={`align-middle ${className}`} />
);

// Pixel Background Component (extracted to prevent re-renders)
const PixelBackground = React.memo(({ environment = 'forest' }) => {
  // Faint scenery behind the content, drawn from the battle-scene layers.
  const backgrounds = {
    forest: 'bg_forest_trees',
    mountain: 'bg_village_mountains',
    castle: 'bg_village_town',
    dungeon: 'bg_lair_town',
    dragon: 'bg_lair_sky'
  };

  return (
    <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
      <SpriteBackground id={backgrounds[environment] || backgrounds.forest} className="absolute inset-0" />
    </div>
  );
});

PixelBackground.displayName = 'PixelBackground';

// Setup Screen Component (extracted to prevent re-creation on every render)
const SetupScreen = React.memo(({
  setupStep,
  setupForm,
  setSetupForm,
  validateStep,
  nextStep,
  setSetupStep
}) => {
  // Refs to maintain focus across re-renders
  const heroNameRef = React.useRef(null);
  const cigarettesRef = React.useRef(null);
  const priceRef = React.useRef(null);

  // Restore focus after render if input was focused before
  React.useEffect(() => {
    const activeElement = document.activeElement;
    if (setupStep === 1 && heroNameRef.current) {
      if (activeElement === heroNameRef.current || !document.activeElement || document.activeElement === document.body) {
        heroNameRef.current.focus();
      }
    } else if (setupStep === 4 && cigarettesRef.current) {
      if (activeElement === cigarettesRef.current || !document.activeElement || document.activeElement === document.body) {
        cigarettesRef.current.focus();
      }
    } else if (setupStep === 5 && priceRef.current) {
      if (activeElement === priceRef.current || !document.activeElement || document.activeElement === document.body) {
        priceRef.current.focus();
      }
    }
  });

  // Generate star positions once to prevent re-renders on input change
  const stars = useMemo(() => {
    return [...Array(50)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5
    }));
  }, []);

  const stepHeading = (icon, text) => (
    <h2 className="type-heading text-brass-300 mb-2 text-balance"><Icon id={icon} scale={2} className="mr-2" />{text}</h2>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 p-4 sm:p-6 relative">
      <PixelBackground environment="castle" />

      <div className="max-w-md mx-auto relative z-10">
        {/* Animated stars background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute animate-twinkle"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`
              }}
            >
              <Sprite id="icon_star" scale={1} />
            </div>
          ))}
        </div>

        <Panel tone="legendary" className="mb-4 text-center">
          <h1 className="type-title text-brass-300 text-balance"><Icon id="icon_castle" scale={2} className="mr-2" />Quit Quest</h1>
          <p className="type-body text-bone mt-1">Begin your legendary smoke-free adventure!</p>
        </Panel>

        <Panel className="mb-4 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-1 qq-label">
              <span className="text-brass-300">Quest Setup Progress</span>
              <span>Step {setupStep} of 5</span>
            </div>
            <ProgressBar value={setupStep} max={5} tone="brass" label="Setup progress" />
          </div>

          {setupStep === 1 && (
            <div className="text-center">
              {stepHeading('icon_helmet', 'Create Your Hero')}
              <label htmlFor="setup-hero-name" className="type-body text-bone block mb-4">What shall we call you on this quest?</label>
              <input
                id="setup-hero-name"
                ref={heroNameRef}
                type="text"
                placeholder="Enter your hero name"
                value={setupForm.heroName}
                onChange={(e) => setSetupForm({...setupForm, heroName: e.target.value})}
                className="qq-input"
                maxLength={20}
              />
              <p className="type-caption text-stone-400 mt-2">Choose a name that inspires you!</p>
            </div>
          )}

          {setupStep === 2 && (
            <div className="text-center">
              {stepHeading('icon_swords', 'Choose Your Class')}
              <p className="type-body text-bone mb-4">Select your hero's class</p>
              <div className="space-y-2">
                {[
                  { id: 'warrior', name: 'Warrior', icon: 'hero_warrior', desc: 'Strong and resilient' },
                  { id: 'mage', name: 'Mage', icon: 'hero_mage', desc: 'Wise and mystical' },
                  { id: 'rogue', name: 'Rogue', icon: 'hero_rogue', desc: 'Swift and cunning' }
                ].map(cls => {
                  const chosen = setupForm.avatarClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSetupForm({...setupForm, avatarClass: cls.id})}
                      aria-pressed={chosen}
                      className={`qq-chip w-full p-3 text-left ${chosen ? 'qq-chip--brass' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Sprite id={cls.icon} scale={1} playing={chosen} />
                          <div>
                            <p className="type-subheading">{cls.name}</p>
                            <p className={`type-caption ${chosen ? 'text-indigo-900' : 'text-stone-400'}`}>{cls.desc}</p>
                          </div>
                        </div>
                        {chosen && <Sprite id="icon_check" scale={1} label="Selected" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {setupStep === 3 && (
            <div className="text-center">
              {stepHeading('icon_calendar', 'Quit Date')}
              <label htmlFor="setup-quit-date" className="type-body text-bone block mb-4">When did you start your smoke-free journey?</label>
              <input
                id="setup-quit-date"
                type="date"
                value={setupForm.quitDate}
                onChange={(e) => setSetupForm({...setupForm, quitDate: e.target.value})}
                max={new Date().toISOString().split('T')[0]}
                className="qq-input"
              />
              <p className="type-caption text-stone-400 mt-2">This can be today or a past date</p>
            </div>
          )}

          {setupStep === 4 && (
            <div className="text-center">
              {stepHeading('icon_cigarette', 'Daily Habit')}
              <label htmlFor="setup-cigarettes" className="type-body text-bone block mb-4">How many cigarettes did you smoke per day?</label>
              <input
                id="setup-cigarettes"
                ref={cigarettesRef}
                type="number"
                placeholder="20"
                value={setupForm.cigarettesPerDay}
                onChange={(e) => setSetupForm({...setupForm, cigarettesPerDay: e.target.value})}
                min="1"
                max="100"
                className="qq-input"
              />
              <p className="type-caption text-stone-400 mt-2">Be honest - we'll track your victories!</p>
            </div>
          )}

          {setupStep === 5 && (
            <div className="text-center">
              {stepHeading('icon_coin_bag', 'Cost Per Pack')}
              <label htmlFor="setup-price" className="type-body text-bone block mb-4">How much did you spend on a pack?</label>
              <input
                id="setup-price"
                ref={priceRef}
                type="number"
                placeholder="12.50"
                value={setupForm.pricePerPack}
                onChange={(e) => setSetupForm({...setupForm, pricePerPack: e.target.value})}
                min="0.01"
                max="100"
                step="0.01"
                className="qq-input"
              />
              <p className="type-caption text-stone-400 mt-2">We'll track your gold savings!</p>
            </div>
          )}

          <div className="flex gap-3">
            {setupStep > 1 && (
              <Button className="flex-1" onClick={() => setSetupStep(setupStep - 1)}>
                <Icon id="icon_arrow_left" />Previous
              </Button>
            )}
            {/* Beginning the quest is a positive commitment, so the last step is moss */}
            <Button
              className="flex-1"
              tone={setupStep === 5 ? 'moss' : 'brass'}
              onClick={nextStep}
              disabled={!validateStep()}
            >
              {setupStep === 5
                ? <><Icon id="icon_swords" />Begin Quest!</>
                : <>Next<Icon id="icon_arrow_right" /></>}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
});

SetupScreen.displayName = 'SetupScreen';

const QuitQuestRPG = () => {
  // Game States
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing'
  const [currentScreen, setCurrentScreen] = useState('dashboard'); // 'dashboard', 'achievements', 'profile', 'battle', 'story', 'stats', 'premium'
  // Screens opened from elsewhere (Records, Premium) return to where they came from.
  const [returnScreen, setReturnScreen] = useState('dashboard');
  const openScreen = (screen) => {
    setReturnScreen(currentScreen === 'premium' || currentScreen === 'stats' ? returnScreen : currentScreen);
    setCurrentScreen(screen);
  };
  const openPremium = () => openScreen('premium');
  const [deleteStep, setDeleteStep] = useState(0); // 0 closed, 1 explain, 2 type to confirm
  const [deleteText, setDeleteText] = useState('');

  // Premium is read from the entitlement layer only; ads follow their own rules.
  const entitlements = useEntitlements();
  const isPremium = entitlements.isPremium;
  const ads = useAds();
  
  // Story System
  const [storyChapter, setStoryChapter] = useState(0);
  const [unlockedStoryDays, setUnlockedStoryDays] = useState([]);
  const [todayStoryViewed, setTodayStoryViewed] = useState(false);
  // Story tab view and selected day live here (not inside StoryScreen) so
  // other screens can open a view, and they survive re-renders.
  const [storyView, setStoryView] = useState('today'); // 'today', 'archive', 'map', 'world'
  const [storyDay, setStoryDay] = useState(null); // null = today
  
  // Battle State
  const [battleState, setBattleState] = useState({
    inBattle: false,
    currentEnemy: null,
    playerHP: 100,
    enemyHP: 100,
    playerMaxHP: 100,
    enemyMaxHP: 100,
    battleLog: [],
    playerTurn: true,
    battleReward: 0,
    comboCount: 0,
    specialCharge: 0,
    battlesWon: 0,
    perfectVictories: 0,
    engine: null, // the battle engine's state (lib/battle/engine.js) while a battle runs
    result: null // the last battle's result screen
  });

  // User Data
  const [userData, setUserData] = useState({
    heroName: '',
    quitDate: '',
    cigarettesPerDay: 20,
    pricePerPack: 12.50,
    achievements: [],
    totalExperience: 0,
    avatarClass: 'warrior', // warrior, mage, rogue
    battlesWon: 0,
    cravingsDefeated: 0,
    storyProgress: [],
    activities: {
      walks: 0,
      exercises: 0,
      meditations: 0,
      waterDrinks: 0,
      breathingExercises: 0,
      socialCalls: 0,
      hobbies: 0,
      healthyMeals: 0
    },
    specialEvents: {
      weekends: 0,
      parties: 0,
      stressfulDays: 0,
      morningSkips: 0,
      nightSkips: 0,
      coffeeWithout: 0,
      drivingWithout: 0,
      holidays: 0
    },
    currentStreak: 0,
    longestStreak: 0,
    settings: {
      dailyReminders: true,
      notificationsEnabled: true
    }
  });

  // Setup Form State
  const [setupStep, setSetupStep] = useState(1);
  const [setupForm, setSetupForm] = useState({
    heroName: '',
    quitDate: '',
    cigarettesPerDay: '',
    pricePerPack: '',
    avatarClass: 'warrior'
  });

  // Calculated Stats
  // True once stats (days smoke-free and so on) have been worked out from the
  // saved quit date. The world map waits for it, so it never sees a stale day.
  const [statsReady, setStatsReady] = useState(false);
  const [stats, setStats] = useState({
    daysSmokeFree: 0,
    moneySaved: 0,
    cigarettesAvoided: 0,
    knightLevel: 1,
    healthStatus: '',
    nextGoal: '',
    healthPercentage: 100,
    experienceToNext: 0
  });

  // Animation states
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // Story Content System
  const storyContent = {
    prologue: {
      title: "The Shadow Falls",
      text: "In the Kingdom of Breathonia, a dark curse known as the Smoke Shadow has plagued the land for generations. You, brave {heroName}, have taken the sacred oath to break free from its grasp and restore light to the realm..."
    },
    chapters: [
      // Chapter 1: Days 1-30 (The Awakening)
      { day: 1, title: "The First Dawn", text: "You awaken in the Temple of Clean Air. The monks whisper of your courage. The first day without the Shadow's touch begins. Your lungs already sing a different song." },
      { day: 2, title: "The Cleansing", text: "The Shadow's poison begins to leave your blood. The monks say by sunset, your body will be free of the demon's immediate grasp." },
      { day: 3, title: "Pure Blood", text: "Three suns have risen. The nicotine demon has fled your veins completely. You feel the first stirrings of true strength." },
      { day: 4, title: "The Taste Returns", text: "Food has flavor again! The innkeeper's stew tastes of herbs and spices you'd forgotten existed." },
      { day: 5, title: "Breathing Lessons", text: "The old warrior trainer nods approvingly. 'Your breath comes easier now, young one. The Shadow loosens its grip on your chest.'" },
      { day: 7, title: "The Week Mark", text: "Seven days! The village celebrates your first victory. Children throw flower petals as you pass. You've earned your first honor badge." },
      { day: 10, title: "Growing Power", text: "Your health meter glows brighter. The local sage notes your improved circulation - 'The life force flows freely now.'" },
      { day: 14, title: "Fortnight Champion", text: "Two weeks of freedom! The Shadow sends stronger cravings to test you, but your resolve holds firm. Your armor gleams brighter." },
      { day: 21, title: "Breaking Chains", text: "The wise woman speaks: 'Twenty-one days to break a curse, twenty-one days to forge a new path. You have done both, warrior.'" },
      { day: 30, title: "The First Month", text: "A full moon cycle complete! Your transformation amazes the kingdom. The Shadow's hold weakens significantly. You are promoted to Knight Second Class!" },
      
      // Chapter 2: Days 31-60 (The Journey)
      { day: 35, title: "New Horizons", text: "Your quest map expands. New territories open up, previously hidden by the Shadow's fog. Your reputation spreads to neighboring villages." },
      { day: 40, title: "The Temptation Woods", text: "You traverse the Temptation Woods where the Shadow whispers its false promises. But your will is iron now." },
      { day: 45, title: "Meeting the Dragon", text: "A wise dragon tells you: 'I too was once enslaved by the Shadow. Your path is true, young knight. Continue.'" },
      { day: 50, title: "Half Century", text: "Fifty days! Bards compose songs of your journey. Your name is spoken with respect in the taverns." },
      { day: 60, title: "The Second Moon", text: "Two full moons of freedom! Your lung capacity has notably improved. The Shadow's influence on your body continues to fade." },
      
      // Chapter 3: Days 61-90 (The Trials)
      { day: 70, title: "The Storm Test", text: "A great storm tests your resolve. Others seek the Shadow's false comfort, but you stand firm against the tempest." },
      { day: 75, title: "Ancient Wisdom", text: "You discover ancient texts in the library: 'Those who conquer the Shadow for 75 days begin to see the world in new colors.'" },
      { day: 80, title: "The Clear Path", text: "Your morning runs no longer leave you breathless. The training master promotes you to elite status." },
      { day: 90, title: "Season's End", text: "Three months! A full season without the Shadow! Your risk of falling has decreased dramatically. Knight First Class achieved!" },
      
      // Chapter 4: Days 91-120 (The Transformation)
      { day: 100, title: "Century Warrior", text: "ONE HUNDRED DAYS! The kingdom erupts in celebration! You're awarded the Legendary Hero medallion. The Shadow trembles at your name." },
      { day: 105, title: "The Healing", text: "The court physician marvels: 'Your blood flows like a river freed from dam. Your heart beats with the strength of two!'" },
      { day: 110, title: "Shadow's Desperation", text: "The Shadow makes its strongest attack yet, sending waves of cravings. You laugh and dispel them with ease." },
      { day: 120, title: "Four Moons Strong", text: "Four lunar cycles complete. You barely remember the person enslaved by Shadow. That was another life, another world." },
      
      // Chapter 5: Days 121-150 (The Mastery)
      { day: 130, title: "The Teacher", text: "Young squires seek your guidance. You've become a beacon of hope for those still fighting the Shadow." },
      { day: 140, title: "Deep Healing", text: "Your body keeps repairing itself with newfound vigor, day after day." },
      { day: 150, title: "The Milestone", text: "150 days! The royal court honors you with a feast. Your transformation inspires an entire movement against the Shadow." },
      
      // Chapter 6: Days 151-180 (The Legend)
      { day: 160, title: "Beyond Measure", text: "Your power level exceeds all predictions. The Shadow's influence on you is now merely a distant memory." },
      { day: 170, title: "The Inspiration", text: "Statues are erected in your honor. Your story spreads across the land, giving hope to thousands still trapped." },
      { day: 180, title: "Half Year Hero", text: "SIX MONTHS FREE! The Shadow's curse is truly broken! You stand as living proof that anyone can defeat this ancient enemy. The kingdom rejoices!" },
      
      // Special Milestones
      { day: 200, title: "Transcendent", text: "You've transcended beyond what most thought possible. The Shadow no longer exists in your reality." },
      { day: 250, title: "The Guide", text: "You've become a legendary guide, leading others through their own journeys. Your wisdom is sought throughout the realm." },
      { day: 300, title: "The Immortal", text: "300 days! Songs of your victory will be sung for generations. You've achieved what many thought impossible." },
      { day: 365, title: "The Dragon Slayer", text: "ONE FULL YEAR! The ultimate victory! You've slain the Smoke Dragon permanently. You are forever free, forever legendary. Your name is etched in the stars themselves!" },
      
      // Motivational snippets for random days
      { day: -1, title: "Daily Wisdom", snippets: [
        "The Shadow grows weaker with each passing hour. Stay strong, {heroName}!",
        "Every craving resisted adds to your experience points and legendary status.",
        "The kingdom watches your progress with hope. You inspire many!",
        "Your health regenerates more each day. The healers are amazed!",
        "Gold saved today is equipment earned tomorrow. Your treasury grows!",
        "The Shadow fears your growing strength. It knows its days are numbered.",
        "Other warriors look to you for inspiration. Your journey matters!",
        "Each smoke-free day is a battle won in the greater war.",
        "Your willpower stat increases daily. You're becoming unstoppable!",
        "The prophecy speaks of one who will break the curse. That one is you, {heroName}!"
      ]}
    ],
    epilogue: {
      title: "The New Dawn",
      text: "The Shadow's reign has ended. {heroName} stands victorious, a beacon of hope for all who still fight. The kingdom is forever changed, forever free. Your legend will inspire generations to come."
    }
  };

  // Calculate stats whenever userData changes
  useEffect(() => {
    if (gameState === 'playing' && userData.quitDate) {
      calculateStats();
    }
  }, [userData, gameState]);

  // Check for new story content
  useEffect(() => {
    if (stats.daysSmokeFree > 0 && !todayStoryViewed) {
      const todayStory = storyContent.chapters.find(ch => ch.day === stats.daysSmokeFree);
      if (todayStory && !userData.storyProgress.includes(todayStory.day)) {
        setUserData(prev => ({
          ...prev,
          storyProgress: [...prev.storyProgress, todayStory.day]
        }));
        setTodayStoryViewed(true);
        // Could show notification here
      }
    }
  }, [stats.daysSmokeFree]);

  // Once the game is running, decode the world map's large layers while the
  // browser is idle, so opening the map later does not hitch.
  useEffect(() => {
    if (gameState !== 'playing') return;
    preloadSprites(defaultRegistry, ['overworld_terrain', 'overworld_sea', ...REGION_IDS.map(id => `overworld_shadow_${id}`), 'journey_sky', 'journey_far', 'journey_mid', 'journey_ground', 'journey_fore', 'journey_fog']);
  }, [gameState]);

  // Knight skins (Premium): layered over the default art through the sprite
  // registry's skin packs. Without Premium the classic armour is always used.
  const heroSkin = userData.settings?.heroSkin || null;
  useEffect(() => {
    let live = true;
    if (!isPremium || !heroSkin) {
      defaultRegistry.setSkins([]);
      return undefined;
    }
    loadSkinManifest(skinManifestUrl(heroSkin)).then((m) => {
      if (live) defaultRegistry.setSkins(m ? [m] : []);
    });
    return () => {
      live = false;
    };
  }, [isPremium, heroSkin]);
  const chooseSkin = (id) => setUserData(prev => ({ ...prev, settings: { ...(prev.settings || {}), heroSkin: id } }));

  // No ads ever on battle, Urge Mode or result screens: hard-block the ad
  // layer while any of them is showing or a battle is running.
  const adsBlocked = currentScreen === 'battle' || battleState.inBattle;
  useEffect(() => {
    if (ads && ads.setHardBlock) ads.setHardBlock(adsBlocked);
  }, [ads, adsBlocked]);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('quitQuestData');
      if (savedData) {
        const parsed = JSON.parse(savedData);

        // Restore game state
        if (parsed.gameState) {
          setGameState(parsed.gameState);
        }

        // Restore user data
        if (parsed.userData) {
          setUserData(parsed.userData);
        }

        // Restore battle state if in battle. Battles saved before the battle
        // engine existed are closed quietly (counters are kept).
        if (parsed.battleState) {
          const b = parsed.battleState;
          setBattleState(b.engine && b.engine.v ? b : { ...b, inBattle: false, engine: null, result: null });
        }

        // Restore story progress
        if (parsed.storyChapter !== undefined) {
          setStoryChapter(parsed.storyChapter);
        }
        if (parsed.unlockedStoryDays) {
          setUnlockedStoryDays(parsed.unlockedStoryDays);
        }

        console.log('Progress loaded from localStorage');
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
  }, []); // Run only once on mount

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (gameState === 'playing' && userData.heroName) {
      try {
        const dataToSave = {
          gameState,
          userData,
          battleState,
          storyChapter,
          unlockedStoryDays,
          lastSaved: new Date().toISOString()
        };

        localStorage.setItem('quitQuestData', JSON.stringify(dataToSave));
        console.log('Progress auto-saved');
      } catch (error) {
        console.error('Failed to save data to localStorage:', error);
      }
    }
  }, [userData, gameState, battleState, storyChapter, unlockedStoryDays]);


  const calculateStats = () => {
    const quitDate = new Date(userData.quitDate);
    const now = new Date();
    const diffTime = Math.abs(now - quitDate);
    const daysSmokeFree = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const cigarettesPerPack = 20;
    const packsPerDay = userData.cigarettesPerDay / cigarettesPerPack;
    const moneySaved = Math.round(daysSmokeFree * packsPerDay * userData.pricePerPack * 100) / 100;
    const cigarettesAvoided = daysSmokeFree * userData.cigarettesPerDay;
    
    const knightLevel = getKnightLevel(daysSmokeFree);
    const healthStatus = getHealthMessage(daysSmokeFree);
    const nextGoal = getNextGoal(daysSmokeFree);
    const healthPercentage = Math.min(100, 50 + (daysSmokeFree * 0.5));
    const experienceToNext = getExperienceToNextLevel(userData.totalExperience);
    
    // Update streak
    if (daysSmokeFree > userData.longestStreak) {
      setUserData(prev => ({
        ...prev,
        currentStreak: daysSmokeFree,
        longestStreak: daysSmokeFree
      }));
    }
    
    // Update story chapter
    if (daysSmokeFree <= 30) setStoryChapter(1);
    else if (daysSmokeFree <= 60) setStoryChapter(2);
    else if (daysSmokeFree <= 90) setStoryChapter(3);
    else if (daysSmokeFree <= 120) setStoryChapter(4);
    else if (daysSmokeFree <= 150) setStoryChapter(5);
    else if (daysSmokeFree <= 180) setStoryChapter(6);
    else setStoryChapter(7);
    
    // Check for new achievements
    checkAchievements(daysSmokeFree);
    
    // Check for level up
    if (knightLevel > stats.knightLevel && stats.knightLevel > 0) {
      setIsLevelingUp(true);
      setTimeout(() => setIsLevelingUp(false), 2000);
    }
    
    setStatsReady(true);
    setStats({
      daysSmokeFree,
      moneySaved,
      cigarettesAvoided,
      knightLevel,
      healthStatus,
      nextGoal,
      healthPercentage,
      experienceToNext
    });
  };

  const getKnightLevel = (days) => {
    if (days < 7) return 1;
    if (days < 30) return 2;
    if (days < 100) return 3;
    if (days < 365) return 4;
    return 5;
  };

  const getExperienceToNextLevel = (currentExp) => {
    const levels = [0, 100, 600, 1600, 4100, 14100];
    for (let i = 1; i < levels.length; i++) {
      if (currentExp < levels[i]) {
        return levels[i] - currentExp;
      }
    }
    return 0;
  };

  const getHealthMessage = (days) => {
    if (days === 0) return "Your quest begins now! Every moment counts.";
    if (days === 1) return "Your oxygen levels are improving!";
    if (days < 7) return "Your heart rate is settling down!";
    if (days < 30) return "Your energy levels are increasing!";
    if (days < 90) return "Your lung function is improving!";
    if (days < 365) return "Your risk of heart disease is dropping!";
    return "You're a legendary smoke-free hero!";
  };

  // Sprite shown beside the health message (same day bands as above).
  const getHealthIcon = (days) => {
    if (days === 0) return 'icon_castle';
    if (days === 1) return 'icon_lung';
    if (days < 7) return 'icon_heartbeat';
    if (days < 30) return 'icon_star';
    if (days < 90) return 'icon_strength';
    if (days < 365) return 'icon_shield';
    return 'icon_crown';
  };

  const getNextGoal = (days) => {
    if (days < 1) return "First Victory (1 day)";
    if (days < 7) return "Weekly Warrior (7 days)";
    if (days < 30) return "Monthly Champion (30 days)";
    if (days < 100) return "Legendary Hero (100 days)";
    if (days < 365) return "Dragon Slayer (365 days)";
    return "All major goals achieved!";
  };

  const achievementsList = [
    // Health-Based Achievements (Real Medical Milestones)
    { id: 'HEALTH_20MIN', title: 'First Breath of Freedom', description: 'Heart rate and blood pressure start to come down.', icon: 'icon_heartbeat', minutesRequired: 20, experience: 50, rarity: 'common', category: 'health' },
    { id: 'HEALTH_8HR', title: 'Clean Blood Rising', description: 'Carbon monoxide in your blood is dropping.', icon: 'icon_blood_drop', hoursRequired: 8, experience: 100, rarity: 'common', category: 'health' },
    { id: 'HEALTH_12HR', title: 'Oxygen Warrior', description: 'Carbon monoxide usually returns to normal, and oxygen levels rise.', icon: 'icon_breath', hoursRequired: 12, experience: 150, rarity: 'common', category: 'health' },
    { id: 'HEALTH_24HR', title: 'Heart Guardian', description: 'Your risk of heart attack begins to drop.', icon: 'icon_heart', daysRequired: 1, experience: 200, rarity: 'uncommon', category: 'health' },
    { id: 'HEALTH_48HR', title: 'Senses Awakening', description: 'Nerve endings begin to recover; taste and smell often improve.', icon: 'icon_nose', daysRequired: 2, experience: 300, rarity: 'uncommon', category: 'health' },
    { id: 'HEALTH_3DAY', title: 'Breathing Master', description: 'Airways begin to relax, and breathing often gets easier.', icon: 'icon_lung', daysRequired: 3, experience: 400, rarity: 'uncommon', category: 'health' },
    { id: 'HEALTH_2WEEK', title: 'Circulation Hero', description: 'Circulation usually starts to improve.', icon: 'icon_circulation', daysRequired: 14, experience: 600, rarity: 'rare', category: 'health' },
    { id: 'HEALTH_1MONTH', title: 'Lung Capacity Rising', description: 'Lung function often improves over the coming months.', icon: 'icon_breath', daysRequired: 30, experience: 1000, rarity: 'rare', category: 'health' },
    { id: 'HEALTH_3MONTH', title: 'Cilia Regeneration', description: 'Lung cilia begin to recover, and coughing often eases.', icon: 'icon_sprout', daysRequired: 90, experience: 2000, rarity: 'rare', category: 'health' },
    { id: 'HEALTH_9MONTH', title: 'Respiratory Champion', description: 'Coughing and shortness of breath usually keep easing.', icon: 'icon_strength', daysRequired: 270, experience: 5000, rarity: 'epic', category: 'health' },
    { id: 'HEALTH_1YEAR', title: 'Heart Disease Halved', description: 'Your added risk of heart disease is about half that of a smoker.', icon: 'icon_heart_healed', daysRequired: 365, experience: 10000, rarity: 'epic', category: 'health' },
    { id: 'HEALTH_5YEAR', title: 'Steady Mind', description: 'Stroke risk can fall to about that of a non-smoker.', icon: 'icon_brain', daysRequired: 1825, experience: 25000, rarity: 'legendary', category: 'health' },
    { id: 'HEALTH_10YEAR', title: 'Ten-Year Sentinel', description: 'Lung cancer risk drops to about half that of a smoker.', icon: 'icon_shield', daysRequired: 3650, experience: 50000, rarity: 'legendary', category: 'health' },
    { id: 'HEALTH_15YEAR', title: 'Reborn Phoenix', description: 'Heart disease risk is close to that of a non-smoker.', icon: 'icon_flame', daysRequired: 5475, experience: 100000, rarity: 'legendary', category: 'health' },

    // Time-Based Achievements
    { id: 'HOUR_1', title: 'The First Hour', description: 'One hour smoke-free!', icon: 'icon_hourglass', hoursRequired: 1, experience: 10, rarity: 'common', category: 'time' },
    { id: 'HOUR_12', title: 'Half Day Hero', description: '12 hours smoke-free!', icon: 'icon_moon', hoursRequired: 12, experience: 25, rarity: 'common', category: 'time' },
    { id: 'DAY_1', title: 'First Victory', description: 'Survived your first day!', icon: 'icon_shield', daysRequired: 1, experience: 100, rarity: 'common', category: 'time' },
    { id: 'DAY_3', title: 'Three Day Trial', description: '3 days smoke-free!', icon: 'icon_medal_bronze', daysRequired: 3, experience: 200, rarity: 'common', category: 'time' },
    { id: 'WEEK_1', title: 'Weekly Warrior', description: 'One week of freedom!', icon: 'icon_swords', daysRequired: 7, experience: 500, rarity: 'uncommon', category: 'time' },
    { id: 'WEEK_2', title: 'Fortnight Fighter', description: 'Two weeks strong!', icon: 'icon_bow', daysRequired: 14, experience: 750, rarity: 'uncommon', category: 'time' },
    { id: 'DAY_21', title: 'Habit Breaker', description: '21 days - new habits formed!', icon: 'icon_hammer', daysRequired: 21, experience: 900, rarity: 'uncommon', category: 'time' },
    { id: 'MONTH_1', title: 'Monthly Champion', description: 'A full month smoke-free!', icon: 'icon_trophy', daysRequired: 30, experience: 1000, rarity: 'rare', category: 'time' },
    { id: 'DAY_50', title: 'Half Century', description: '50 days of victory!', icon: 'icon_medal_silver', daysRequired: 50, experience: 1500, rarity: 'rare', category: 'time' },
    { id: 'MONTH_2', title: 'Two Moon Warrior', description: 'Two months conquered!', icon: 'icon_moon', daysRequired: 60, experience: 1800, rarity: 'rare', category: 'time' },
    { id: 'DAY_90', title: 'Season Master', description: '90 days - a full season!', icon: 'icon_leaf', daysRequired: 90, experience: 2200, rarity: 'rare', category: 'time' },
    { id: 'MILESTONE_100', title: 'Century Mark', description: '100 days of triumph!', icon: 'icon_medal_gold', daysRequired: 100, experience: 2500, rarity: 'epic', category: 'time' },
    { id: 'MONTH_6', title: 'Half Year Hero', description: 'Six months smoke-free!', icon: 'icon_star', daysRequired: 180, experience: 5000, rarity: 'epic', category: 'time' },
    { id: 'DAY_300', title: 'Almost There', description: '300 days strong!', icon: 'icon_target', daysRequired: 300, experience: 7500, rarity: 'epic', category: 'time' },
    { id: 'YEAR_1', title: 'Dragon Slayer', description: 'One year smoke-free!', icon: 'icon_dragon', daysRequired: 365, experience: 10000, rarity: 'legendary', category: 'time' },
    { id: 'DAY_500', title: 'Eternal Warrior', description: '500 days of freedom!', icon: 'icon_infinity', daysRequired: 500, experience: 12500, rarity: 'legendary', category: 'time' },
    { id: 'YEAR_2', title: 'Legend Reborn', description: 'Two years smoke-free!', icon: 'icon_flame', daysRequired: 730, experience: 20000, rarity: 'legendary', category: 'time' },
    { id: 'DAY_1000', title: 'Millennial Master', description: '1000 days - truly legendary!', icon: 'icon_special', daysRequired: 1000, experience: 25000, rarity: 'legendary', category: 'time' },

    // Money Saved Achievements
    { id: 'SAVE_10', title: 'Copper Collector', description: 'Saved $10!', icon: 'icon_coin', moneySaved: 10, experience: 50, rarity: 'common', category: 'money' },
    { id: 'SAVE_25', title: 'Silver Saver', description: 'Saved $25!', icon: 'icon_medal_silver', moneySaved: 25, experience: 100, rarity: 'common', category: 'money' },
    { id: 'SAVE_50', title: 'Gold Getter', description: 'Saved $50!', icon: 'icon_medal_gold', moneySaved: 50, experience: 200, rarity: 'uncommon', category: 'money' },
    { id: 'SAVE_100', title: 'Treasure Hunter', description: 'Saved $100!', icon: 'icon_coin_bag', moneySaved: 100, experience: 400, rarity: 'uncommon', category: 'money' },
    { id: 'SAVE_250', title: 'Vault Builder', description: 'Saved $250!', icon: 'icon_chest', moneySaved: 250, experience: 750, rarity: 'rare', category: 'money' },
    { id: 'SAVE_500', title: 'Fortune Finder', description: 'Saved $500!', icon: 'icon_gem', moneySaved: 500, experience: 1500, rarity: 'rare', category: 'money' },
    { id: 'SAVE_1000', title: 'Wealth Warrior', description: 'Saved $1,000!', icon: 'icon_crown', moneySaved: 1000, experience: 3000, rarity: 'epic', category: 'money' },
    { id: 'SAVE_2500', title: 'Treasury Master', description: 'Saved $2,500!', icon: 'icon_castle', moneySaved: 2500, experience: 6000, rarity: 'epic', category: 'money' },
    { id: 'SAVE_5000', title: 'Dragon\'s Hoard', description: 'Saved $5,000!', icon: 'icon_dragon', moneySaved: 5000, experience: 10000, rarity: 'legendary', category: 'money' },
    { id: 'SAVE_10000', title: 'Kingdom\'s Fortune', description: 'Saved $10,000!', icon: 'icon_coins', moneySaved: 10000, experience: 20000, rarity: 'legendary', category: 'money' },

    // Battle Achievements
    { id: 'BATTLE_1', title: 'First Blood', description: 'Won your first battle!', icon: 'icon_blood_drop', battlesRequired: 1, experience: 50, rarity: 'common', category: 'battle' },
    { id: 'BATTLE_10', title: 'Craving Fighter', description: 'Defeated 10 cravings!', icon: 'icon_swords', battlesRequired: 10, experience: 300, rarity: 'uncommon', category: 'battle' },
    { id: 'BATTLE_25', title: 'Demon Hunter', description: 'Defeated 25 cravings!', icon: 'icon_skull', battlesRequired: 25, experience: 800, rarity: 'uncommon', category: 'battle' },
    { id: 'BATTLE_50', title: 'Craving Slayer', description: 'Defeated 50 cravings!', icon: 'icon_sword', battlesRequired: 50, experience: 1500, rarity: 'rare', category: 'battle' },
    { id: 'BATTLE_100', title: 'Centurion', description: 'Won 100 battles!', icon: 'icon_helmet', battlesRequired: 100, experience: 3000, rarity: 'epic', category: 'battle' },
    { id: 'BATTLE_250', title: 'War Legend', description: 'Defeated 250 cravings!', icon: 'icon_lightning', battlesRequired: 250, experience: 7500, rarity: 'epic', category: 'battle' },
    { id: 'PERFECT_5', title: 'Flawless Fighter', description: '5 perfect victories!', icon: 'icon_sparkle', perfectRequired: 5, experience: 500, rarity: 'uncommon', category: 'battle' },
    { id: 'PERFECT_10', title: 'Perfect Warrior', description: '10 flawless victories!', icon: 'icon_star', perfectRequired: 10, experience: 1000, rarity: 'rare', category: 'battle' },
    { id: 'PERFECT_25', title: 'Untouchable Champion', description: '25 perfect victories!', icon: 'icon_special', perfectRequired: 25, experience: 2500, rarity: 'epic', category: 'battle' },

    // Activity Achievements
    { id: 'WALK_10', title: 'Wanderer', description: 'Logged 10 walks!', icon: 'icon_walk', activityRequired: { type: 'walks', count: 10 }, experience: 200, rarity: 'common', category: 'activity' },
    { id: 'WALK_50', title: 'Pathfinder', description: 'Logged 50 walks!', icon: 'icon_walk', activityRequired: { type: 'walks', count: 50 }, experience: 1000, rarity: 'uncommon', category: 'activity' },
    { id: 'EXERCISE_10', title: 'Fitness Initiate', description: 'Completed 10 workouts!', icon: 'icon_strength', activityRequired: { type: 'exercises', count: 10 }, experience: 250, rarity: 'common', category: 'activity' },
    { id: 'EXERCISE_50', title: 'Gym Champion', description: 'Completed 50 workouts!', icon: 'icon_strength', activityRequired: { type: 'exercises', count: 50 }, experience: 1250, rarity: 'uncommon', category: 'activity' },
    { id: 'MEDITATE_10', title: 'Inner Peace Seeker', description: 'Meditated 10 times!', icon: 'icon_meditate', activityRequired: { type: 'meditations', count: 10 }, experience: 200, rarity: 'common', category: 'activity' },
    { id: 'MEDITATE_50', title: 'Zen Master', description: 'Meditated 50 times!', icon: 'icon_meditate', activityRequired: { type: 'meditations', count: 50 }, experience: 1000, rarity: 'uncommon', category: 'activity' },
    { id: 'WATER_25', title: 'Hydration Hero', description: 'Drank water 25 times!', icon: 'icon_droplet', activityRequired: { type: 'waterDrinks', count: 25 }, experience: 300, rarity: 'common', category: 'activity' },
    { id: 'WATER_100', title: 'Aqua Champion', description: 'Drank water 100 times!', icon: 'icon_water', activityRequired: { type: 'waterDrinks', count: 100 }, experience: 1200, rarity: 'uncommon', category: 'activity' },

    // Streak Achievements
    { id: 'STREAK_7', title: 'Week Streak', description: '7 day streak maintained!', icon: 'icon_flame', streakDays: 7, experience: 500, rarity: 'uncommon', category: 'streak' },
    { id: 'STREAK_30', title: 'Unstoppable', description: '30 day streak!', icon: 'icon_lightning', streakDays: 30, experience: 1500, rarity: 'rare', category: 'streak' },
    { id: 'STREAK_100', title: 'Unbreakable', description: '100 day streak!', icon: 'icon_gem', streakDays: 100, experience: 5000, rarity: 'epic', category: 'streak' },
    { id: 'STREAK_365', title: 'Year of Iron Will', description: '365 day streak!', icon: 'icon_trophy', streakDays: 365, experience: 15000, rarity: 'legendary', category: 'streak' },

    // Cigarette Avoidance Achievements
    { id: 'CIGS_100', title: 'Century Saver', description: 'Avoided 100 cigarettes!', icon: 'icon_no_smoking', cigarettesAvoided: 100, experience: 300, rarity: 'common', category: 'avoidance' },
    { id: 'CIGS_500', title: 'Half Thousand', description: 'Avoided 500 cigarettes!', icon: 'icon_shield', cigarettesAvoided: 500, experience: 1000, rarity: 'uncommon', category: 'avoidance' },
    { id: 'CIGS_1000', title: 'Thousand Strong', description: 'Avoided 1,000 cigarettes!', icon: 'icon_star', cigarettesAvoided: 1000, experience: 2000, rarity: 'rare', category: 'avoidance' },
    { id: 'CIGS_5000', title: 'Five Thousand Victory', description: 'Avoided 5,000 cigarettes!', icon: 'icon_special', cigarettesAvoided: 5000, experience: 5000, rarity: 'epic', category: 'avoidance' },
    { id: 'CIGS_10000', title: 'Ten Thousand Triumph', description: 'Avoided 10,000 cigarettes!', icon: 'icon_crown', cigarettesAvoided: 10000, experience: 10000, rarity: 'legendary', category: 'avoidance' },
  ];

  const checkAchievements = (days) => {
    let newAchievements = [...userData.achievements];
    let totalExp = userData.totalExperience;

    // Calculate time-based values
    const hours = days * 24;
    const minutes = hours * 60;

    achievementsList.forEach(achievement => {
      // Skip if already unlocked
      if (newAchievements.includes(achievement.id)) return;

      let shouldUnlock = false;

      // Check different achievement types
      if (achievement.minutesRequired && minutes >= achievement.minutesRequired) {
        shouldUnlock = true;
      } else if (achievement.hoursRequired && hours >= achievement.hoursRequired) {
        shouldUnlock = true;
      } else if (achievement.daysRequired && days >= achievement.daysRequired) {
        shouldUnlock = true;
      } else if (achievement.moneySaved && stats.moneySaved >= achievement.moneySaved) {
        shouldUnlock = true;
      } else if (achievement.cigarettesAvoided && stats.cigarettesAvoided >= achievement.cigarettesAvoided) {
        shouldUnlock = true;
      } else if (achievement.battlesRequired && userData.battlesWon >= achievement.battlesRequired) {
        shouldUnlock = true;
      } else if (achievement.perfectRequired && battleState.perfectVictories >= achievement.perfectRequired) {
        shouldUnlock = true;
      } else if (achievement.streakDays && userData.currentStreak >= achievement.streakDays) {
        shouldUnlock = true;
      } else if (achievement.activityRequired) {
        const activityType = achievement.activityRequired.type;
        const requiredCount = achievement.activityRequired.count;
        const actualCount = userData.activities[activityType] || 0;
        if (actualCount >= requiredCount) {
          shouldUnlock = true;
        }
      }

      if (shouldUnlock) {
        newAchievements.push(achievement.id);
        totalExp += achievement.experience;
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 3000);
      }
    });

    if (newAchievements.length !== userData.achievements.length) {
      setUserData(prev => ({
        ...prev,
        achievements: newAchievements,
        totalExperience: totalExp
      }));
    }
  };

  // Battle System Functions
  // `id` doubles as the sprite key: the battle sprite is `enemy_<id>`.
  // Stats are unchanged from the original five enemies they replace
  // (Nicotine Imp, Smoke Specter, Craving Demon, Tar Monster, Addiction Dragon).
  // Enemies, abilities and tuning live in lib/battle/data/; the rules in
  // lib/battle/engine.js. This component starts battles and applies results.
  const heroClass = ['warrior', 'mage', 'rogue'].includes(userData.avatarClass) ? userData.avatarClass : 'warrior';

  /** What other screens read about the current battle (kept in the saved shape). */
  const battleSnapshot = (engine) => ({
    engine,
    inBattle: !isOver(engine),
    currentEnemy: { id: engine.enemy.id, name: engine.enemy.name, boss: engine.enemy.boss },
    tier: engine.tier,
    playerHP: engine.hero.hp,
    playerMaxHP: engine.hero.maxHp,
    enemyHP: engine.enemy.hp,
    enemyMaxHP: engine.enemy.maxHp,
    battleLog: engine.log,
  });

  const beginBattle = (enemyId, tier = 'other', mode = 'practice') => {
    const engine = createBattle({
      enemyId,
      level: Math.max(1, stats.knightLevel || 1),
      heroClass,
      heroName: userData.heroName || 'Hero',
      tier,
      mode,
    });
    setBattleState(prev => ({ ...prev, ...battleSnapshot(engine), result: null }));
    setCurrentScreen('battle');
  };

  // Practice battles: a random enemy for the craving strength (as before).
  const startBattle = (intensity = 'medium') => beginBattle(pickEnemy({ mode: 'practice', tier: intensity }), intensity, 'practice');

  // A battle against one specific enemy (the world map's fortress uses this
  // for the Nicotine Lord).
  const startBattleAgainst = (enemyId) => {
    if (ENEMIES[enemyId]) beginBattle(enemyId, enemyId === 'nicotine_lord' ? 'boss' : 'other', 'practice');
  };

  // Urge Mode: one tap, no setup, works offline. The enemy fits the map
  // region the player is in.
  const startUrge = () => beginBattle(pickEnemy({ mode: 'urge', day: stats.daysSmokeFree }), 'urge', 'urge');

  const onBattleChange = (engine) => setBattleState(prev => ({ ...prev, ...battleSnapshot(engine) }));

  /**
   * A battle ended. Victory keeps the original rewards (XP from the enemy and
   * combo, battles won, cravings defeated, flawless victories) with XP tapering
   * after several wins in a day. Defeat and leaving take nothing away.
   * Every result goes in the battle log (Advanced Stats).
   */
  const finishBattle = (engine) => {
    const outcome = engine.phase;
    const history = userData.history?.battles || [];
    const rewards = battleRewards(engine, history);
    const result = { outcome, rewards, enemyName: engine.enemy.name, enemyId: engine.enemy.id, tier: engine.tier, mode: engine.mode, seed: engine.turn };
    const entry = { at: new Date().toISOString(), tier: engine.tier, result: outcome === 'victory' ? 'win' : outcome === 'defeat' ? 'loss' : 'fled', enemyId: engine.enemy.id };
    setBattleState(prev => ({
      ...prev,
      ...battleSnapshot(engine),
      result,
      battlesWon: outcome === 'victory' ? prev.battlesWon + 1 : prev.battlesWon,
      perfectVictories: outcome === 'victory' && rewards.perfect ? prev.perfectVictories + 1 : prev.perfectVictories,
    }));
    setUserData(prev => ({
      ...prev,
      ...(outcome === 'victory'
        ? { totalExperience: prev.totalExperience + rewards.xp, battlesWon: prev.battlesWon + 1, cravingsDefeated: prev.cravingsDefeated + 1 }
        : {}),
      history: logBattle(prev.history, entry),
    }));
    if (outcome === 'victory' && !reducedEffectsOn) {
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 3000);
    }
  };

  // Sound and haptics follow the player's settings (Hero tab).
  const battleFx = useBattleFx({ sound: userData.settings?.sound === true, haptics: userData.settings?.haptics !== false });

  const handleSetupSubmit = () => {
    const quitDate = new Date(setupForm.quitDate);
    if (quitDate > new Date()) {
      alert('Quit date cannot be in the future!');
      return;
    }
    
    setUserData({
      ...userData,
      heroName: setupForm.heroName,
      quitDate: setupForm.quitDate,
      cigarettesPerDay: parseInt(setupForm.cigarettesPerDay),
      pricePerPack: parseFloat(setupForm.pricePerPack),
      avatarClass: setupForm.avatarClass,
      activities: {
        walks: 0,
        exercises: 0,
        meditations: 0,
        waterDrinks: 0,
        breathingExercises: 0,
        socialCalls: 0,
        hobbies: 0,
        healthyMeals: 0
      },
      specialEvents: {
        weekends: 0,
        parties: 0,
        stressfulDays: 0,
        morningSkips: 0,
        nightSkips: 0,
        coffeeWithout: 0,
        drivingWithout: 0,
        holidays: 0
      },
      currentStreak: 0,
      longestStreak: 0
    });
    setGameState('playing');
  };

  const validateStep = useCallback(() => {
    switch (setupStep) {
      case 1:
        return setupForm.heroName.trim().length > 0;
      case 2:
        return setupForm.avatarClass && setupForm.avatarClass.length > 0;
      case 3:
        return setupForm.quitDate.length > 0;
      case 4:
        const cigs = parseInt(setupForm.cigarettesPerDay);
        return cigs > 0 && cigs <= 100;
      case 5:
        const price = parseFloat(setupForm.pricePerPack);
        return price > 0 && price <= 100;
      default:
        return false;
    }
  }, [setupStep, setupForm]);

  const nextStep = useCallback(() => {
    switch (setupStep) {
      case 1:
        if (setupForm.heroName.trim().length > 0) {
          setSetupStep(setupStep + 1);
        }
        break;
      case 2:
        if (setupForm.avatarClass && setupForm.avatarClass.length > 0) {
          setSetupStep(setupStep + 1);
        }
        break;
      case 3:
        if (setupForm.quitDate.length > 0) {
          setSetupStep(setupStep + 1);
        }
        break;
      case 4:
        const cigs = parseInt(setupForm.cigarettesPerDay);
        if (cigs > 0 && cigs <= 100) {
          setSetupStep(setupStep + 1);
        }
        break;
      case 5:
        const price = parseFloat(setupForm.pricePerPack);
        if (price > 0 && price <= 100) {
          handleSetupSubmit();
        }
        break;
    }
  }, [setupStep, setupForm, handleSetupSubmit, setSetupStep]);

  const resetProgress = () => {
    if (window.confirm('Are you sure? This will permanently delete all your progress!')) {
      setUserData({
        heroName: '',
        quitDate: '',
        cigarettesPerDay: 20,
        pricePerPack: 12.50,
        achievements: [],
        totalExperience: 0,
        avatarClass: 'warrior',
        battlesWon: 0,
        cravingsDefeated: 0,
        storyProgress: [],
        activities: {
          walks: 0,
          exercises: 0,
          meditations: 0,
          waterDrinks: 0,
          breathingExercises: 0,
          socialCalls: 0,
          hobbies: 0,
          healthyMeals: 0
        },
        specialEvents: {
          weekends: 0,
          parties: 0,
          stressfulDays: 0,
          morningSkips: 0,
          nightSkips: 0,
          coffeeWithout: 0,
          drivingWithout: 0,
          holidays: 0
        },
        currentStreak: 0,
        longestStreak: 0,
        settings: {
          dailyReminders: true,
          notificationsEnabled: true
        }
      });
      setSetupForm({
        heroName: '',
        quitDate: '',
        cigarettesPerDay: '',
        pricePerPack: '',
        avatarClass: 'warrior'
      });
      setSetupStep(1);
      setGameState('setup');
      setCurrentScreen('dashboard');

      // Clear localStorage
      localStorage.removeItem('quitQuestData');
      console.log('Progress reset - localStorage cleared');
    }
  };

  // Character portrait: the class-coloured knight in a bevelled frame.
  // Level 4 adds a brass ring, level 5 a bright ring and a crown.
  const CharacterAvatar = ({ level, className, size = 'large', animate = false }) => {
    const baseClass = className || userData.avatarClass;

    // Hero sprite is 32px; scale is a whole number that fits the frame.
    const sizeConfig = {
      small: { box: 'w-12 h-12', scale: 1 },
      medium: { box: 'w-20 h-20', scale: 2 },
      large: { box: 'w-28 h-28', scale: 3 }
    };
    const config = sizeConfig[size];
    const sprite = { warrior: 'hero_warrior', mage: 'hero_mage', rogue: 'hero_rogue' }[baseClass] || 'hero_warrior';
    const frame = level >= 5 ? 'qq-portrait--legend' : level >= 4 ? 'qq-portrait--veteran' : '';

    return (
      <div className={`relative inline-block ${animate ? 'animate-bounce-slow' : ''}`}>
        <div className={`qq-portrait ${frame} ${config.box}`}>
          <Sprite id={sprite} scale={config.scale} label={`${baseClass} avatar`} />
        </div>

        {level >= 5 && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <Sprite id="icon_crown" scale={size === 'small' ? 1 : 2} />
          </div>
        )}

        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
          <span className={`qq-chip qq-chip--brass whitespace-nowrap px-1.5 ${size === 'small' ? 'text-sm' : 'text-base'}`}>
            LV {level}
          </span>
        </div>
      </div>
    );
  };

  // Particle Effects Component
  const ParticleEffect = () => {
    // Not over a battle (it has its own effects), and not with Reduced Effects.
    if (!showParticles || currentScreen === 'battle' || userData.settings?.reducedEffects === true) return null;

    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            <Sprite id="icon_sparkle" scale={2} />
          </div>
        ))}
      </div>
    );
  };

  // Level Up Animation
  const LevelUpAnimation = () => {
    if (!isLevelingUp) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 px-4">
        <Panel tone="legendary" className="animate-fade-in text-center px-6">
          <h2 className="type-title text-brass-300">Level Up!</h2>
          <p className="type-stat text-bone mt-1">Knight Level {stats.knightLevel}</p>
        </Panel>
      </div>
    );
  };

  // Shared heading for screens and panels.
  const Heading = ({ icon, children, as: Tag = 'h2', className = '' }) => (
    <Tag className={`type-heading text-brass-300 text-center text-balance ${className}`}>
      {icon && <Icon id={icon} scale={2} className="mr-2" />}
      {children}
    </Tag>
  );

  // The world map is presentation only: this adapter hands it the game's
  // own progress, health milestones and story beats. Another data source
  // could produce the same shape (see lib/journey/layout.js).
  const journeyData = () => ({
    day: stats.daysSmokeFree,
    milestones: achievementsList
      .filter(a => a.category === 'health')
      .map(a => ({
        id: a.id,
        day: a.minutesRequired ? a.minutesRequired / 1440 : a.hoursRequired ? a.hoursRequired / 24 : a.daysRequired,
        title: a.title,
        description: a.description,
        icon: a.icon,
        experience: a.experience,
        unlocked: userData.achievements.includes(a.id)
      })),
    storyBeats: storyContent.chapters.filter(ch => ch.day > 0).map(ch => ({ day: ch.day, title: ch.title })),
    // Craving camps along the road start the same battles as the Quest tab's
    // Mild / Medium / Strong buttons; the fortress is the Nicotine Lord.
    encounters: [
      { id: 'camp_mild', day: 9, tier: 'mild', enemies: TIER_POOLS.mild.map(id => ENEMIES[id].name) },
      { id: 'camp_medium', day: 45, tier: 'medium', enemies: TIER_POOLS.medium.map(id => ENEMIES[id].name) },
      { id: 'camp_strong', day: 100, tier: 'strong', enemies: TIER_POOLS.strong.map(id => ENEMIES[id].name) },
      { id: 'fortress', day: 180, tier: 'boss', boss: true, enemyId: 'nicotine_lord', enemies: ['The Nicotine Lord'] }
    ]
  });

  // A short celebration on the map after a battle is won (set on Continue).
  const [mapCheer, setMapCheer] = useState(null); // { id, xp }
  // It plays once: cleared after it has shown, so revisiting the tab does not replay it.
  useEffect(() => {
    if (!mapCheer) return undefined;
    const t = setTimeout(() => setMapCheer(null), 3000);
    return () => clearTimeout(t);
  }, [mapCheer]);

  /**
   * The world map (from above or on the road; the choice is remembered).
   * Shown at the top of the Quest tab (compact: no region list) and in full
   * under Story > World Map. Called as a function so the map stays mounted.
   */
  const renderWorldMap = ({ compact = false, celebrate = null }) => {
    if (!statsReady) return <div className="qq-inset" style={{ height: 240 }} aria-hidden="true" />;
    const mapView = userData.journey?.view === 'road' ? 'road' : 'overhead';
    const openStoryDay = (day) => {
      setStoryDay(day);
      setStoryView('archive');
      setCurrentScreen('story');
    };
    const shared = {
      journey: buildJourneyLayout(journeyData()),
      journeyState: userData.journey || {},
      onJourneyStateChange: (patch) => setUserData(prev => ({ ...prev, journey: { ...(prev.journey || {}), ...patch } })),
      reducedEffects: userData.settings?.reducedEffects === true,
      onOpenStory: openStoryDay,
      onFight: (encounter) => (encounter.boss ? startBattleAgainst(encounter.enemyId) : startBattle(encounter.tier)),
      onReadRegion: (region) => {
        // Open the region's first story chapter you have reached.
        const today = Math.max(1, stats.daysSmokeFree);
        const first = storyContent.chapters.find(ch => ch.day >= Math.max(1, region.from) && ch.day <= Math.min(region.to, today));
        openStoryDay(first ? first.day : Math.min(region.from, today));
      },
      compact,
      celebrate,
      onOpenFull: compact ? () => { setStoryView('world'); setCurrentScreen('story'); } : undefined,
    };
    return (
      <>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Map view">
          {[['overhead', 'From above'], ['road', 'On the road']].map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={mapView === v}
              onClick={() => shared.onJourneyStateChange({ view: v })}
              className={`qq-chip px-3 py-1 text-base ${mapView === v ? 'qq-chip--brass' : 'qq-chip--locked'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mapView === 'overhead' ? (
          <OverworldMap {...shared} heroClass={heroClass} />
        ) : (
          <JourneyMap {...shared} heroSpriteId={`hero_${heroClass}`} />
        )}
      </>
    );
  };

  // Story Screen Component
  const StoryScreen = () => {
    // A remembered day never runs past today (e.g. after a progress reset).
    const selectedDay = storyDay !== null && storyDay <= Math.max(1, stats.daysSmokeFree) ? storyDay : (stats.daysSmokeFree || 1);
    const setSelectedDay = setStoryDay;
    const viewMode = storyView;
    const setViewMode = setStoryView;

    const availableStories = storyContent.chapters.filter(
      ch => ch.day > 0 && ch.day <= stats.daysSmokeFree
    );

    const getCurrentStory = () => {
      const todayStory = storyContent.chapters.find(ch => ch.day === stats.daysSmokeFree);
      if (todayStory) return todayStory;

      // Return a random motivational snippet
      const snippets = storyContent.chapters.find(ch => ch.day === -1)?.snippets || [];
      const randomSnippet = snippets[Math.floor(Math.random() * snippets.length)];
      return {
        title: "Daily Wisdom",
        text: randomSnippet.replace('{heroName}', userData.heroName)
      };
    };

    const getStoryForDay = (day) => {
      const story = storyContent.chapters.find(ch => ch.day === day);
      if (story) {
        return {
          ...story,
          text: story.text.replace('{heroName}', userData.heroName)
        };
      }

      // Return daily wisdom for days without specific stories
      const snippets = storyContent.chapters.find(ch => ch.day === -1)?.snippets || [];
      const snippetIndex = day % snippets.length;
      return {
        title: `Day ${day} - Daily Wisdom`,
        text: snippets[snippetIndex].replace('{heroName}', userData.heroName)
      };
    };

    const currentStory = getCurrentStory();
    const selectedStory = getStoryForDay(selectedDay);

    const chapters = [
      { n: 1, name: 'Awakening', days: '1-30' },
      { n: 2, name: 'Journey', days: '31-60' },
      { n: 3, name: 'Trials', days: '61-90' },
      { n: 4, name: 'Transform', days: '91-120' },
      { n: 5, name: 'Mastery', days: '121-150' },
      { n: 6, name: 'Legend', days: '151-180' }
    ];

    return (
      <div className="space-y-4">
        {/* Story Header */}
        <Panel tone="raised" className="relative overflow-hidden">
          <PixelBackground environment={
            storyChapter <= 2 ? 'forest' :
            storyChapter <= 4 ? 'mountain' :
            storyChapter <= 6 ? 'castle' :
            'dragon'
          } />

          <div className="relative z-10">
            <h2 className="type-heading text-brass-300 text-center text-balance mb-1">
              <Icon id="icon_scroll" scale={2} className="mr-2" />The Legend of {userData.heroName}
            </h2>
            <p className="type-caption text-indigo-300 text-center">
              Chapter {storyChapter}: Day {stats.daysSmokeFree} of Your Epic Journey
            </p>

            {/* View Mode Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {[['today', "Today's Story"], ['archive', 'Story Archive'], ['map', 'Journey Map'], ['world', 'World Map']].map(([mode, label]) => (
                <Button key={mode} size="sm" selected={viewMode === mode} onClick={() => setViewMode(mode)}>
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </Panel>

        {/* Today's Story View */}
        {viewMode === 'today' && currentStory && (
          <Panel className="space-y-4">
            <h3 className="type-heading text-brass-300 text-center text-balance">{currentStory.title}</h3>
            <div className="qq-inset qq-inset--parchment p-5">
              <p className="story-text text-center">
                {currentStory.text.replace('{heroName}', userData.heroName)}
              </p>
            </div>

            {/* Story Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Stories Read', availableStories.length], ['Chapter', storyChapter], ['Days Total', stats.daysSmokeFree]].map(([label, value]) => (
                <div key={label} className="qq-inset p-2">
                  <p className="qq-label">{label}</p>
                  <p className="type-stat text-brass-300">{value}</p>
                </div>
              ))}
            </div>

            {!todayStoryViewed && stats.daysSmokeFree === currentStory.day && (
              <p className="text-center animate-pulse type-label text-brass-300">
                <Icon id="icon_sparkle" className="mr-1" />New chapter unlocked!<Icon id="icon_sparkle" className="ml-1" />
              </p>
            )}
          </Panel>
        )}

        {/* Story Archive View */}
        {viewMode === 'archive' && (
          <Panel className="space-y-4">
            <Heading icon="icon_book">Your Story Collection</Heading>

            {/* Day Selector */}
            <div>
              <label htmlFor="story-day" className="qq-label block mb-2">Select Day to Read</label>
              <div className="flex gap-2 items-center">
                <Button
                  size="sm"
                  onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                  disabled={selectedDay <= 1}
                  aria-label="Previous day"
                >
                  <Icon id="icon_arrow_left" />
                </Button>
                <input
                  id="story-day"
                  type="number"
                  value={selectedDay}
                  onChange={(e) => {
                    const day = Math.min(stats.daysSmokeFree, Math.max(1, parseInt(e.target.value) || 1));
                    setSelectedDay(day);
                  }}
                  min="1"
                  max={stats.daysSmokeFree}
                  className="qq-input w-20 py-1"
                />
                <Button
                  size="sm"
                  onClick={() => setSelectedDay(Math.min(stats.daysSmokeFree, selectedDay + 1))}
                  disabled={selectedDay >= stats.daysSmokeFree}
                  aria-label="Next day"
                >
                  <Icon id="icon_arrow_right" />
                </Button>
                <span className="qq-label">of {stats.daysSmokeFree} days</span>
              </div>
            </div>

            {/* Selected Story Display */}
            <div className="space-y-3">
              <h4 className="type-subheading text-brass-300 text-center text-balance">
                Day {selectedDay}: {selectedStory.title}
              </h4>
              <div className="qq-inset qq-inset--parchment p-5">
                <p className="story-text text-center">
                  {selectedStory.text}
                </p>
              </div>
              {selectedStory.day > 0 && (
                <p className="type-caption text-brass-400 text-center">
                  {selectedStory.day <= 30 ? 'Chapter 1: The Awakening' :
                   selectedStory.day <= 60 ? 'Chapter 2: The Journey' :
                   selectedStory.day <= 90 ? 'Chapter 3: The Trials' :
                   selectedStory.day <= 120 ? 'Chapter 4: The Transformation' :
                   selectedStory.day <= 150 ? 'Chapter 5: The Mastery' :
                   'Chapter 6: The Legend'}
                </p>
              )}
            </div>

            {/* Premium side tales for this day (none written yet; see lib/premium/story.js) */}
            {premiumChaptersFor(selectedDay, isPremium).map((tale) => (
              <Panel key={tale.title} tone={tale.locked ? 'sunken' : 'parchment'} className="space-y-2">
                <p className="type-subheading text-brass-300">{tale.locked && <Icon id="icon_lock" className="mr-2" />}{tale.title}</p>
                {tale.locked ? (
                  <Button size="sm" onClick={openPremium}>A Premium side tale. See Premium</Button>
                ) : (
                  <p className="story-text">{tale.text}</p>
                )}
              </Panel>
            ))}

            {/* Quick Jump to Milestone Days */}
            <div>
              <p className="qq-label mb-2">Quick Jump to Milestones</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 3, 7, 14, 21, 30, 50, 60, 90, 100, 120, 150, 180, 365].map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    disabled={day > stats.daysSmokeFree}
                    className={`qq-chip px-2 py-1 text-base ${day <= stats.daysSmokeFree ? '' : 'qq-chip--locked'}`}
                  >
                    Day {day}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {/* World Map View */}
        {viewMode === 'world' && (
          <Panel className="space-y-2">
            <Heading icon="icon_map">The World</Heading>
            {renderWorldMap({})}
            <AdSlot screen="worldMap" inCravingFlow={battleState.inBattle} />
          </Panel>
        )}

        {/* Journey Map View */}
        {viewMode === 'map' && (
          <Panel tone="parchment" className="space-y-4">
            <Heading icon="icon_map">Your Heroic Journey</Heading>

            {/* Chapter Progress: reached chapters are progress, so moss */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {chapters.map(ch => (
                <div key={ch.n} className={`qq-chip p-2 ${storyChapter >= ch.n ? 'qq-chip--moss' : 'qq-chip--locked'}`}>
                  <p className="text-sm leading-tight">Ch.{ch.n}: {ch.name}</p>
                  <p className="text-lg leading-tight">Days {ch.days}</p>
                </div>
              ))}
            </div>

            {/* Interactive Day Grid */}
            <div className="qq-inset p-3">
              <p className="type-caption text-brass-300 mb-2">Tap any unlocked day to read its story:</p>
              <div className="grid grid-cols-10 gap-1">
                {[...Array(180)].map((_, i) => {
                  const day = i + 1;
                  const hasStory = storyContent.chapters.some(ch => ch.day === day);
                  const isUnlocked = day <= stats.daysSmokeFree;
                  const isCurrent = day === stats.daysSmokeFree;

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (isUnlocked) {
                          setSelectedDay(day);
                          setViewMode('archive');
                        }
                      }}
                      disabled={!isUnlocked}
                      className={`qq-chip h-8 flex items-center justify-center text-sm ${
                        isCurrent ? 'qq-chip--brass animate-pulse' :
                        isUnlocked ? (hasStory ? 'qq-chip--moss' : '') :
                        hasStory ? 'qq-chip--sealed' :
                        'qq-chip--locked'
                      }`}
                      title={
                        isUnlocked ? `Day ${day} - Tap to read` :
                        `Day ${day} - Locked (${day - stats.daysSmokeFree} days to unlock)`
                      }
                    >
                      {hasStory && isUnlocked ? <Sprite id="icon_scroll" scale={1} label={`Day ${day} story`} /> : day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-around gap-2 qq-label">
              <span className="text-moss-300"><Icon id="icon_scroll" className="mr-1" />Story Day ({availableStories.length})</span>
              <span className="text-indigo-300"><Icon id="icon_check" className="mr-1" />Completed Day</span>
              <span className="text-brass-300 animate-pulse"><Icon id="icon_star" className="mr-1" />Today</span>
              <span className="text-stone-400"><Icon id="icon_lock" className="mr-1" />Locked</span>
            </div>

            {/* Progress Summary */}
            <div className="qq-inset text-center space-y-2">
              <p className="type-caption text-bone">
                You've unlocked {availableStories.length} of {storyContent.chapters.filter(ch => ch.day > 0).length} story entries
              </p>
              <ProgressBar value={stats.daysSmokeFree} max={180} tone="moss" label="Six-month journey" />
              <p className="qq-label text-moss-300">
                {Math.round((stats.daysSmokeFree / 180) * 100)}% of 6-month journey complete
              </p>
            </div>
          </Panel>
        )}
      </div>
    );
  };

  // Dashboard Screen Component
  const DashboardScreen = () => {
    const logActivity = (activityType) => {
      const newActivities = { ...userData.activities };
      const newSpecialEvents = { ...userData.specialEvents };

      // Update activity counts
      switch(activityType) {
        case 'walk':
          newActivities.walks++;
          break;
        case 'exercise':
          newActivities.exercises++;
          break;
        case 'meditate':
          newActivities.meditations++;
          break;
        case 'water':
          newActivities.waterDrinks++;
          break;
        case 'breathing':
          newActivities.breathingExercises++;
          break;
        case 'social':
          newActivities.socialCalls++;
          break;
        case 'hobby':
          newActivities.hobbies++;
          break;
        case 'meal':
          newActivities.healthyMeals++;
          break;
        // Special events
        case 'weekend':
          newSpecialEvents.weekends++;
          break;
        case 'party':
          newSpecialEvents.parties++;
          break;
        case 'stress':
          newSpecialEvents.stressfulDays++;
          break;
        case 'coffee':
          newSpecialEvents.coffeeWithout++;
          break;
        case 'driving':
          newSpecialEvents.drivingWithout++;
          break;
      }

      setUserData(prev => ({
        ...prev,
        activities: newActivities,
        specialEvents: newSpecialEvents,
        totalExperience: prev.totalExperience + 10 // Small XP for activities
      }));

      // Check for new achievements
      checkAchievements(stats.daysSmokeFree);
    };

    const environment = [
      null,
      { icon: 'icon_hut', text: 'The Humble Beginning - Forest Path' },
      { icon: 'icon_tree', text: 'The Enchanted Forest - Growing Stronger' },
      { icon: 'icon_mountain', text: 'The Mountain Peak - Rising Above' },
      { icon: 'icon_castle', text: 'The Royal Castle - Nearly There' },
      { icon: 'icon_volcano', text: 'The Dragon\'s Lair - Ultimate Power' }
    ][Math.min(5, Math.max(1, stats.knightLevel))];

    return (
      <div className="space-y-4 relative overflow-x-clip">
        <PixelBackground environment={
          stats.knightLevel === 1 ? 'forest' :
          stats.knightLevel === 2 ? 'forest' :
          stats.knightLevel === 3 ? 'mountain' :
          stats.knightLevel === 4 ? 'castle' :
          'dragon'
        } />

        {/* Story Alert if new story available */}
        {userData.storyProgress.includes(stats.daysSmokeFree) && !todayStoryViewed && (
          <Panel tone="raised" className="text-center relative z-10 space-y-2">
            <p className="type-subheading text-brass-300">
              <Icon id="icon_scroll" className="mr-2" />New Story Chapter Unlocked!<Icon id="icon_scroll" className="ml-2" />
            </p>
            <Button size="sm" onClick={() => setCurrentScreen('story')}>
              Read Now
            </Button>
          </Panel>
        )}

        {/* The world map leads the Quest tab: where the knight is on the journey */}
        <Panel className="relative z-10 space-y-2 qq-home-map">
          <Heading icon="icon_map">Your Journey</Heading>
          {renderWorldMap({ compact: true, celebrate: mapCheer })}
        </Panel>

        {/* Craving Emergency: fighting a craving is a positive action, so moss */}
        <Panel tone="danger" className="text-center relative z-10 space-y-3">
          <h3 className="type-heading text-rust-300">
            <Icon id="icon_alert" className="mr-2" />Craving Emergency?
          </h3>
          <p className="type-body text-bone">Fight the urge with an epic battle!</p>
          <Button tone="moss" onClick={startUrge} className="w-full">
            <Icon id="icon_alert" />Urge Mode: start now
          </Button>
          <p className="qq-label">Or pick how strong it feels</p>
          <div className="grid grid-cols-3 gap-2">
            <Button tone="moss" onClick={() => startBattle('mild')}>Mild</Button>
            <Button tone="moss" onClick={() => startBattle('medium')}>Medium</Button>
            <Button tone="moss" onClick={() => startBattle('strong')}>Strong</Button>
          </div>
        </Panel>

        {/* Hero Card with Avatar */}
        <Panel tone="raised" className="relative z-10">
          <div className="flex items-center gap-5 flex-wrap">
            <CharacterAvatar level={stats.knightLevel} size="large" animate={isLevelingUp} />
            <div className="min-w-0 flex-1">
              <h2 className="type-heading text-bone break-words">{userData.heroName}</h2>
              <p className="type-caption text-indigo-300 capitalize">Level {stats.knightLevel} {userData.avatarClass}</p>
              <div className="mt-2">
                <p className="type-statXL text-moss-300">{stats.daysSmokeFree}</p>
                <p className="qq-label">Days Smoke-Free</p>
              </div>
              <p className="mt-2 qq-label text-bone flex flex-wrap items-center gap-x-2">
                <Sprite id="icon_swords" scale={1} />
                Battles Won: <span className="type-stat text-brass-300">{userData.battlesWon}</span>
              </p>
            </div>
          </div>

          {/* Health & XP Bars: both are positive progress, so moss */}
          <div className="space-y-3 mt-5">
            <div>
              <div className="flex justify-between qq-label mb-1">
                <span>Health</span>
                <span className="text-moss-300">{Math.round(stats.healthPercentage)}%</span>
              </div>
              <ProgressBar value={stats.healthPercentage} tone="moss" label="Health" />
            </div>
            <div>
              <div className="flex justify-between qq-label mb-1">
                <span>Experience</span>
                <span className="text-moss-300">{stats.experienceToNext} to next level</span>
              </div>
              <ProgressBar value={userData.totalExperience % 500} max={500} tone="moss" label="Experience" />
            </div>
          </div>
        </Panel>

        {/* Environment Card */}
        <Panel tone="sunken" className="relative z-10 space-y-2 text-center">
          <p className="type-subheading text-indigo-300">
            <Icon id={environment.icon} className="mr-2" />
            {environment.text}
          </p>
          <Button
            size="sm"
            onClick={() => {
              setStoryView('world');
              setCurrentScreen('story');
            }}
          >
            <Icon id="icon_map" />Full map &amp; regions
          </Button>
        </Panel>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <Panel className="text-center">
            <Sprite id="icon_coins" scale={2} className="mx-auto mb-1 block" />
            <p className="qq-label">Gold Saved</p>
            <p className="type-statL text-brass-300">${stats.moneySaved.toFixed(2)}</p>
            <div className="mt-2 flex justify-center gap-1 min-h-4">
              {[...Array(Math.min(5, Math.floor(stats.moneySaved / 100)))].map((_, i) => (
                <Sprite key={i} id="icon_coin_bag" scale={1} />
              ))}
            </div>
          </Panel>

          <Panel className="text-center">
            <Sprite id="icon_shield" scale={2} className="mx-auto mb-1 block" />
            <p className="qq-label">Enemies Defeated</p>
            <p className="type-statL text-bone">{stats.cigarettesAvoided.toLocaleString()}</p>
            <div className="mt-2 flex justify-center gap-1 min-h-4">
              {[...Array(Math.min(5, Math.floor(stats.cigarettesAvoided / 500)))].map((_, i) => (
                <Sprite key={i} id="icon_skull" scale={1} />
              ))}
            </div>
          </Panel>
        </div>

        {/* Records & Treasury: Premium stats and savings (free players see previews) */}
        <Panel tone="sunken" className="relative z-10 text-center space-y-2">
          <p className="type-subheading text-indigo-300"><Icon id="icon_scroll" className="mr-2" />Records &amp; Treasury</p>
          <p className="type-caption text-bone">Your streak, battles and savings in depth.</p>
          <Button size="sm" onClick={() => openScreen('stats')}>
            <Icon id="icon_target" />Open Records
          </Button>
        </Panel>

        {/* A gentle, one-time mention of Premium after a real milestone */}
        <PremiumNote />

        {/* Real-World Activities Section: logging one is a positive action */}
        <Panel className="relative z-10 space-y-3">
          <h3 className="type-heading text-brass-300 flex items-center gap-2">
            <Sprite id="icon_heartbeat" scale={2} /> Healthy Activities
          </h3>
          <p className="type-body text-bone">Log activities to earn achievements!</p>
          <div className="grid grid-cols-2 gap-2">
            {[['walk', 'icon_walk', 'Walk'], ['exercise', 'icon_strength', 'Exercise'], ['meditate', 'icon_meditate', 'Meditate'], ['water', 'icon_droplet', 'Water']].map(([type, icon, label]) => (
              <Button key={type} tone="moss" size="sm" onClick={() => logActivity(type)}>
                <Icon id={icon} />{label}
              </Button>
            ))}
          </div>
        </Panel>

        {/* Health Status */}
        <Panel className="relative overflow-hidden z-10 space-y-3">
          <div className="absolute bottom-0 right-0 opacity-20 pointer-events-none">
            <Sprite id="icon_heart" scale={5} className="animate-pulse" />
          </div>
          <h3 className="type-heading text-brass-300 flex items-center gap-2 relative z-10">
            <Sprite id="icon_heart" scale={2} /> Health Status
          </h3>
          <p className="type-body text-bone relative z-10"><Icon id={getHealthIcon(stats.daysSmokeFree)} className="mr-2" />{stats.healthStatus}</p>
          <div className="grid grid-cols-4 gap-2 relative z-10">
            {stats.daysSmokeFree >= 1 && <span className="animate-bounce-slow"><Sprite id="icon_lung" scale={2} label="Lungs recovering" /></span>}
            {stats.daysSmokeFree >= 7 && <span className="animate-bounce-slow" style={{animationDelay: '0.1s'}}><Sprite id="icon_heartbeat" scale={2} label="Heart rate normal" /></span>}
            {stats.daysSmokeFree >= 30 && <span className="animate-bounce-slow" style={{animationDelay: '0.2s'}}><Sprite id="icon_strength" scale={2} label="Lung function improving" /></span>}
            {stats.daysSmokeFree >= 100 && <span className="animate-bounce-slow" style={{animationDelay: '0.3s'}}><Sprite id="icon_shield" scale={2} label="Heart disease risk dropping" /></span>}
          </div>
        </Panel>

        <div className="relative z-10">
          <AdSlot screen="dashboard" inCravingFlow={battleState.inBattle} />
        </div>
      </div>
    );
  };

  /**
   * Premium note: shown at most twice ever (after day 7 and after day 30),
   * never in the first session, never while a battle is on, gone for good
   * once dismissed. No pressure: two buttons, "See Premium" and "Not now".
   */
  const PREMIUM_NOTE_DAYS = [7, 30];
  const premiumNoteDay = [...PREMIUM_NOTE_DAYS].reverse().find(d => stats.daysSmokeFree >= d);
  const premiumNotesSeen = userData.premiumNote?.seen || [];
  const showPremiumNote =
    !isPremium &&
    !battleState.inBattle &&
    !(ads && ads.firstSession) &&
    premiumNoteDay !== undefined &&
    !premiumNotesSeen.includes(premiumNoteDay) &&
    premiumNotesSeen.length < PREMIUM_NOTE_DAYS.length;
  const dismissPremiumNote = () => setUserData(prev => ({
    ...prev,
    premiumNote: { seen: [...new Set([...(prev.premiumNote?.seen || []), ...PREMIUM_NOTE_DAYS.filter(d => d <= stats.daysSmokeFree)])] }
  }));
  const PremiumNote = () => (showPremiumNote ? (
    <Panel tone="raised" className="relative z-10 space-y-2 text-center" role="note" aria-label="About Premium">
      <p className="type-subheading text-brass-300">
        {premiumNoteDay === 7 ? 'A whole week smoke-free.' : 'A month smoke-free.'}
      </p>
      <p className="type-body text-bone">
        If you would like deeper stats, savings projections and new armour for your knight, Premium has them. Everything you use now stays free.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={() => { dismissPremiumNote(); openPremium(); }}>See Premium</Button>
        <Button size="sm" onClick={dismissPremiumNote}>Not now</Button>
      </div>
    </Panel>
  ) : null);

  // Records & Treasury: advanced stats and savings projections (Premium),
  // with locked previews for everyone else.
  const RecordsScreen = () => {
    const statsData = advancedStats(userData, { perfectVictories: battleState.perfectVictories || 0 });
    const savings = savingsProjection(userData);
    return (
      <div className="space-y-4">
        <Panel tone="raised" className="text-center space-y-1">
          <Heading icon="icon_scroll">Records &amp; Treasury</Heading>
          <p className="type-caption text-bone">Day {stats.daysSmokeFree} of your quest</p>
        </Panel>

        <section className="space-y-3" aria-labelledby="records-stats">
          <h3 id="records-stats" className="type-heading text-brass-300 text-center">Advanced Stats</h3>
          <PremiumGate
            title="Advanced Stats"
            summary="Your streak, cravings resisted week by week, and battle results by craving strength. Shown here with sample numbers."
            onOpenPremium={openPremium}
            preview={<AdvancedStats data={SAMPLE_STATS} />}
          >
            <AdvancedStats data={statsData} />
          </PremiumGate>
        </section>

        <section className="space-y-3" aria-labelledby="records-savings">
          <h3 id="records-savings" className="type-heading text-brass-300 text-center">Savings Projections</h3>
          <PremiumGate
            title="Savings Projections"
            summary="What you will have saved at each milestone and over the next year, from the costs you entered. Shown here with sample numbers."
            onOpenPremium={openPremium}
            preview={<SavingsProjections data={SAMPLE_SAVINGS} />}
          >
            <SavingsProjections data={savings} />
          </PremiumGate>
        </section>

        <AdSlot screen="stats" inCravingFlow={battleState.inBattle} />

        <div className="text-center">
          <Button size="sm" onClick={() => setCurrentScreen(returnScreen)}>
            <Icon id="icon_arrow_left" />Back
          </Button>
        </div>
      </div>
    );
  };

  // Battle Screen Component
  /** After a battle: back to the Quest tab and its map; a win gets a cheer there. */
  const continueAfterBattle = () => {
    const r = battleState.result;
    setBattleState(prev => ({ ...prev, result: null, engine: null, inBattle: false }));
    setMapCheer(r && r.outcome === 'victory' ? { id: Date.now(), xp: r.rewards.xp } : null);
    setCurrentScreen('dashboard');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const BattleScreen = () => {
    const engine = battleState.engine;
    const r = battleState.result;
    // The battle stays on screen when it ends: the outcome plays on the field
    // and the results appear beneath it.
    if (engine && (!isOver(engine) || r)) {
      return (
        <BattleView
          battle={engine}
          onChange={onBattleChange}
          onFinish={finishBattle}
          heroSpriteId={`hero_${heroClass}`}
          reducedEffects={reducedEffectsOn}
          fx={battleFx}
          result={r}
          onContinue={continueAfterBattle}
          onRetry={r ? () => beginBattle(r.enemyId, r.tier, r.mode) : undefined}
          onUrgeAgain={startUrge}
        />
      );
    }
    return <BattleCamp onUrge={startUrge} onPractice={startBattle} />;
  };

  // Achievements Screen Component
  const AchievementsScreen = () => {
    const unlockedCount = userData.achievements.length;
    const totalCount = achievementsList.length;
    const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

    // Helper to check if achievement is unlocked
    const isUnlocked = (achievementId) => userData.achievements.includes(achievementId);

    const getRarityBadge = (rarity) => {
      const names = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
      const key = names[rarity] ? rarity : 'common';
      return <><Icon id={`icon_rarity_${key}`} className="mr-1" />{names[key]}</>;
    };

    return (
      <div className="space-y-4 max-w-4xl mx-auto pb-8">
        {/* Header Stats */}
        <Panel tone="raised" className="sticky top-0 z-10 space-y-3">
          <Heading icon="icon_trophy">Hall of Glory</Heading>
          <div className="flex justify-around">
            <div className="text-center">
              <p className="type-statL text-moss-300">{unlockedCount}</p>
              <p className="qq-label">Unlocked</p>
            </div>
            <div className="text-center">
              <p className="type-statL text-bone">{totalCount}</p>
              <p className="qq-label">Total</p>
            </div>
          </div>
          <ProgressBar value={completionPercentage} tone="moss" label="Achievements unlocked" />
        </Panel>

        {/* Achievement Gallery Grid: completed achievements carry the moss meaning */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {achievementsList.map((achievement) => {
            const unlocked = isUnlocked(achievement.id);

            return (
              <Panel
                key={achievement.id}
                tone={unlocked ? (achievement.rarity === 'legendary' ? 'legendary' : 'default') : 'sunken'}
                className={`text-center ${unlocked ? 'animate-achievement-unlock' : 'opacity-60'}`}
              >
                <div className="mb-2">
                  <span className={`inline-block ${unlocked ? 'animate-bounce-slow' : ''}`}>
                    <Sprite id={unlocked ? achievement.icon : 'icon_lock'} scale={3} label={unlocked ? achievement.title : 'Locked'} />
                  </span>
                </div>

                <h3 className={`type-subheading mb-1 text-balance ${unlocked ? 'text-brass-300' : 'text-stone-400'}`}>
                  {unlocked ? achievement.title : '???'}
                </h3>

                <p className={`type-caption mb-3 ${unlocked ? 'text-bone' : 'text-stone-500'}`}>
                  {unlocked ? achievement.description : 'Keep questing to unlock!'}
                </p>

                <div className="flex items-center justify-between qq-label">
                  <span className={unlocked ? 'text-moss-300' : 'text-stone-500'}>
                    {unlocked && <Icon id="icon_check" className="mr-1" />}+{achievement.experience} XP
                  </span>
                  <span className={unlocked ? 'text-bone' : 'text-stone-500'}>
                    {getRarityBadge(achievement.rarity)}
                  </span>
                </div>
              </Panel>
            );
          })}
        </div>

        {/* Motivational Footer */}
        {unlockedCount < totalCount && (
          <Panel tone="sunken" className="text-center">
            <p className="type-body text-indigo-300">
              <Icon id="icon_swords" className="mr-2" />{totalCount - unlockedCount} achievements await you, brave hero!<Icon id="icon_swords" className="ml-2" />
            </p>
          </Panel>
        )}

        {/* Completion Message */}
        {unlockedCount === totalCount && (
          <Panel tone="legendary" className="text-center space-y-2 animate-pulse-slow">
            <Sprite id="icon_special" scale={2} className="mx-auto block" />
            <h3 className="type-title text-brass-300">Legendary Hero!</h3>
            <p className="type-body text-bone">
              You've unlocked every achievement! You are a true legend of Quit Quest!
            </p>
          </Panel>
        )}
      </div>
    );
  };

  // World regrowth (streak greening) is on unless the player turned it off.
  const worldGreeningOn = userData.settings?.worldGreening !== false;
  const toggleWorldGreening = () => {
    setUserData(prev => ({
      ...prev,
      settings: { ...(prev.settings || {}), worldGreening: prev.settings?.worldGreening === false }
    }));
  };

  /** Flip a boolean setting; `fallback` is its value when never set. */
  const toggleSetting = (key, fallback) => {
    setUserData(prev => {
      const current = prev.settings && typeof prev.settings[key] === 'boolean' ? prev.settings[key] : fallback;
      return { ...prev, settings: { ...(prev.settings || {}), [key]: !current } };
    });
  };

  // Reduced Effects: calmer battles and world map (no shake, flashes, heavy particles or parallax).
  const reducedEffectsOn = userData.settings?.reducedEffects === true;
  const toggleReducedEffects = () => {
    setUserData(prev => ({
      ...prev,
      settings: { ...(prev.settings || {}), reducedEffects: !(prev.settings?.reducedEffects === true) }
    }));
  };

  /** Delete my data: two steps, then everything this app saved is removed. */
  const deleteMyData = () => {
    deleteLocalData(window.localStorage);
    defaultRegistry.setSkins([]);
    window.location.reload();
  };

  // Settings on the Hero tab: help, legal, data, and (dev builds only) tools.
  const SettingsPanels = () => (
    <>
      <SupportPanel />

      <Panel className="space-y-3">
        <h3 className="type-subheading text-brass-300 flex flex-wrap items-center gap-2"><Sprite id="icon_scroll" scale={2} />Privacy &amp; Terms</h3>
        <ul className="space-y-1 type-body">
          <li>{qqEnv.legal.privacyPolicyUrl ? <a className="qq-link" href={qqEnv.legal.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">Privacy Policy</a> : <span className="text-stone-400">Privacy Policy (coming soon)</span>}</li>
          <li>{qqEnv.legal.termsUrl ? <a className="qq-link" href={qqEnv.legal.termsUrl} target="_blank" rel="noopener noreferrer">Terms of Use</a> : <span className="text-stone-400">Terms of Use (coming soon)</span>}</li>
        </ul>
        <p className="type-caption text-stone-400">
          Manage or cancel: Premium is a one-time purchase with nothing to cancel. Purchases are managed in your App Store or Google Play account settings.
        </p>
      </Panel>

      <Panel tone="danger" className="space-y-3">
        <h3 className="type-subheading text-rust-300">Delete My Data</h3>
        {deleteStep === 0 && (
          <>
            <p className="type-body text-bone">Remove your hero, progress and settings from this device. This cannot be undone.</p>
            <Button tone="rust" size="sm" onClick={() => setDeleteStep(1)}>Delete my data</Button>
          </>
        )}
        {deleteStep === 1 && (
          <>
            <p className="type-body text-bone">
              This deletes your quit date, story progress, achievements, battle records and settings. Purchases are not affected: they belong to your App Store or Google Play account and can be restored.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button tone="rust" size="sm" onClick={() => { setDeleteText(''); setDeleteStep(2); }}>Continue</Button>
              <Button size="sm" onClick={() => setDeleteStep(0)}>Keep my data</Button>
            </div>
          </>
        )}
        {deleteStep === 2 && (
          <>
            <label htmlFor="qq-delete-confirm" className="type-body text-bone block">Type DELETE to confirm.</label>
            <input id="qq-delete-confirm" className="qq-input w-full" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
            <div className="flex flex-wrap gap-2">
              <Button tone="rust" size="sm" disabled={deleteText.trim().toUpperCase() !== 'DELETE'} onClick={deleteMyData}>Delete everything</Button>
              <Button size="sm" onClick={() => setDeleteStep(0)}>Cancel</Button>
            </div>
          </>
        )}
      </Panel>

      {process.env.QQ_DEV_TOOLS === 'true' && DevToolsPanel()}
    </>
  );

  // DEVELOPER TOOLS: present only in development and preview builds. The
  // build flag is inlined, so production bundles drop this panel entirely.
  const DevToolsPanel = process.env.QQ_DEV_TOOLS !== 'true' ? () => null : () => {
    const current = devMockControls.scenario || 'off';
    const choose = (sc) => {
      devMockControls.set(sc === 'off' ? null : sc);
      window.location.reload();
    };
    return (
      <Panel tone="sunken" className="space-y-3 qq-dev-panel">
        <h3 className="type-subheading text-stone-400">Developer tools (not in production builds)</h3>
        <p className="type-caption text-stone-400">Purchase mock: pretend store for testing Premium. Current: {current}.</p>
        <div className="flex flex-wrap gap-2">
          {['off', 'locked', 'unlocked', 'pending', 'failing', 'offline', 'store_unavailable'].map((sc) => (
            <Button key={sc} size="sm" selected={current === sc} onClick={() => choose(sc)}>{sc.replace('_', ' ')}</Button>
          ))}
        </div>
        <Button size="sm" onClick={() => { devMockControls.resetPurchase(); window.location.reload(); }}>Reset mock purchase</Button>
        <p className="type-caption text-stone-400">Battle: jump into any enemy (win or lose instantly from inside the battle).</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(ENEMIES).map((e) => (
            <Button key={e.id} size="sm" onClick={() => beginBattle(e.id, e.boss ? 'boss' : e.tier, 'practice')}>{e.name}</Button>
          ))}
          <Button size="sm" onClick={startUrge}>Urge Mode</Button>
        </div>
      </Panel>
    );
  };

  // Profile Screen Component
  const ProfileScreen = () => (
    <div className="space-y-4">
      <Panel tone="raised">
        <div className="flex flex-col items-center text-center gap-1 pb-2">
          <CharacterAvatar level={stats.knightLevel} size="large" />
          <h2 className="type-title text-bone mt-5 break-words max-w-full">{userData.heroName}</h2>
          <p className="type-caption text-indigo-300 capitalize">Level {stats.knightLevel} {userData.avatarClass}</p>
          <p className="type-statL text-moss-300 mt-1">{stats.daysSmokeFree} Days Strong!</p>
        </div>
      </Panel>

      <Panel className="space-y-3">
        <h3 className="type-subheading text-brass-300">World Regrowth</h3>
        <p className="type-body text-bone">
          As your streak grows, moss creeps into the brass trim and the world turns greener: from day 30, 90 and 150.
        </p>
        <Button tone={worldGreeningOn ? 'moss' : 'brass'} selected={worldGreeningOn} onClick={toggleWorldGreening}>
          {worldGreeningOn ? 'Regrowth on' : 'Regrowth off'}
        </Button>
      </Panel>

      <Panel className="space-y-3">
        <h3 className="type-subheading text-brass-300">Reduced Effects</h3>
        <p className="type-body text-bone">
          Calmer motion everywhere: no screen shake, flashes or heavy particles in battle, and on the world map no drifting particles or parallax, with the knight, reveals and camera moving without animation. Turns on by itself if your device asks for reduced motion.
        </p>
        <Button selected={reducedEffectsOn} onClick={toggleReducedEffects}>
          {reducedEffectsOn ? 'Reduced Effects on' : 'Reduced Effects off'}
        </Button>
      </Panel>

      <Panel className="space-y-3">
        <h3 className="type-subheading text-brass-300">Sound &amp; Haptics</h3>
        <p className="type-body text-bone">
          Battle sounds are off unless you turn them on, and follow your device's silent switch. Haptics are short, gentle buzzes on hits and breathing cues, where your device supports them.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button selected={userData.settings?.sound === true} onClick={() => toggleSetting('sound', false)}>
            {userData.settings?.sound === true ? 'Sound on' : 'Sound off'}
          </Button>
          <Button selected={userData.settings?.haptics !== false} onClick={() => toggleSetting('haptics', true)}>
            {userData.settings?.haptics !== false ? 'Haptics on' : 'Haptics off'}
          </Button>
        </div>
      </Panel>

      {/* Premium */}
      <Panel tone={isPremium ? 'raised' : 'default'} className="space-y-3">
        <h3 className="type-subheading text-brass-300 flex flex-wrap items-center gap-2"><Sprite id="icon_crown" scale={2} />Premium</h3>
        <p className="type-body text-bone">
          {isPremium
            ? 'Premium is unlocked: advanced stats, savings projections, knight skins and no ads. Thank you!'
            : 'A one-time purchase for advanced stats, savings projections, knight skins and no ads. Everything else stays free.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={openPremium}>{isPremium ? 'About Premium' : 'See Premium'}</Button>
          {entitlements.purchasesAvailable && (
            <Button size="sm" onClick={() => entitlements.restore()} disabled={entitlements.restoring}>
              {entitlements.restoring ? 'Restoring...' : 'Restore Purchases'}
            </Button>
          )}
        </div>
      </Panel>

      {/* Knight skins (Premium) */}
      <Panel className="space-y-3">
        <h3 className="type-subheading text-brass-300 flex flex-wrap items-center gap-2"><Sprite id="icon_helmet" scale={2} />Knight Armour</h3>
        <SkinPicker
          heroClass={['warrior', 'mage', 'rogue'].includes(userData.avatarClass) ? userData.avatarClass : 'warrior'}
          selected={heroSkin}
          onSelect={chooseSkin}
          onOpenPremium={openPremium}
        />
      </Panel>

      {SettingsPanels()}
    </div>
  );

  const tabs = [
    { screen: 'dashboard', label: 'Quest', icon: 'icon_shield' },
    { screen: 'story', label: 'Story', icon: 'icon_book', dot: !todayStoryViewed && userData.storyProgress.includes(stats.daysSmokeFree) ? 'brass' : null },
    { screen: 'battle', label: 'Battle', icon: 'icon_swords', dot: battleState.inBattle ? 'rust' : null },
    { screen: 'achievements', label: 'Glory', icon: 'icon_trophy' },
    { screen: 'profile', label: 'Hero', icon: 'icon_helmet' }
  ];

  const greening = greeningStage(stats.daysSmokeFree, worldGreeningOn);

  // Main Game Screen
  const GameScreen = () => (
    <GreeningProvider stage={greening}>
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950 relative">
        {/* World regrowth: a faint moss glow that rises with the streak */}
        {greening > 0 && (
          <div
            className="fixed inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 115%, color-mix(in srgb, var(--c-moss700) ${greening * 14}%, transparent), transparent 65%)` }}
            aria-hidden="true"
          />
        )}

        {/* Particle Effects */}
        <ParticleEffect />

        {/* Level Up Animation */}
        <LevelUpAnimation />

        {/* Header */}
        <header className="bg-indigo-950 border-b-2 border-brass-700 relative">
          <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="type-heading text-brass-300 min-w-0"><Icon id="icon_castle" scale={2} className="mr-2" />Quit Quest</h1>
            {/* Urge Mode: one tap from any screen into a short battle */}
            {!battleState.inBattle && (
              <Button tone="moss" size="sm" onClick={startUrge} className="qq-urge-btn" aria-label="Urge Mode: start a short battle now">
                <Icon id="icon_alert" />Urge
              </Button>
            )}
            <div className="flex items-center gap-3 min-w-0">
              <CharacterAvatar level={stats.knightLevel} size="small" />
              <div className="text-right min-w-0">
                <p className="type-caption text-brass-300 truncate">{userData.heroName}</p>
                <p className="qq-label">Day {stats.daysSmokeFree}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="bg-indigo-900 border-b-2 border-indigo-950 relative" aria-label="Main">
          <div className="max-w-4xl mx-auto grid grid-cols-5">
            {tabs.map(tab => {
              const active = currentScreen === tab.screen;
              return (
                <button
                  key={tab.screen}
                  onClick={() => {
                    if (currentScreen === 'story' && tab.screen !== 'story' && tab.screen !== 'battle' && ads) {
                      const last = (userData.history?.battles || []).slice(-1)[0];
                      ads.maybeInterstitial('story_closed', { inCravingFlow: battleState.inBattle, lastBattleResult: last ? last.result : null });
                    }
                    setCurrentScreen(tab.screen);
                  }}
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-2 text-center ${active ? 'qq-chip qq-chip--brass' : 'text-stone-400'}`}
                >
                  <Sprite id={tab.icon} scale={2} className="mx-auto mb-0.5 block" />
                  <span className={`qq-label qq-tab-label ${active ? 'text-indigo-950' : ''}`}>{tab.label}</span>
                  {tab.dot && (
                    <span className={`absolute top-1 right-2 w-2 h-2 animate-pulse ${tab.dot === 'rust' ? 'bg-rust-400' : 'bg-brass-300'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-4xl mx-auto p-4 relative">
          {/* Called as a function (no hooks) so the map on it stays mounted */}
          {currentScreen === 'dashboard' && DashboardScreen()}
          {/* Called as a function (no hooks) so the world map stays mounted between state changes */}
          {currentScreen === 'story' && StoryScreen()}
          {/* Called as a function (no hooks) so the battle field stays mounted between turns */}
          {currentScreen === 'battle' && BattleScreen()}
          {currentScreen === 'achievements' && <AchievementsScreen />}
          {/* Called as a function (no hooks) so inputs keep focus between state changes */}
          {currentScreen === 'profile' && ProfileScreen()}
          {currentScreen === 'stats' && RecordsScreen()}
          {currentScreen === 'premium' && <PremiumScreen onClose={() => setCurrentScreen(returnScreen)} />}
        </main>
      </div>
    </GreeningProvider>
  );

  return (
    <>
      {gameState === 'setup' ? (
        <SetupScreen
          setupStep={setupStep}
          setupForm={setupForm}
          setSetupForm={setSetupForm}
          validateStep={validateStep}
          nextStep={nextStep}
          setSetupStep={setSetupStep}
        />
      ) : (
        // Called as a function (no hooks) so the game tree is not remounted on every state change
        GameScreen()
      )}
    </>
  );
};

export default QuitQuestRPG;
