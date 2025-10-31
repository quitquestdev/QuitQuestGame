import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, User, Shield, Sword, Crown, Heart, Star, TrendingUp, Award, AlertCircle, Settings, DollarSign, Target, Sparkles, Flame, Wind, Zap, Swords, AlertTriangle, Activity, BookOpen, Scroll, Map } from 'lucide-react';

const QuitQuestRPG = () => {
  // Game States
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing'
  const [currentScreen, setCurrentScreen] = useState('dashboard'); // 'dashboard', 'achievements', 'profile', 'battle', 'story'
  
  // Story System
  const [storyChapter, setStoryChapter] = useState(0);
  const [unlockedStoryDays, setUnlockedStoryDays] = useState([]);
  const [todayStoryViewed, setTodayStoryViewed] = useState(false);
  
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
    perfectVictories: 0
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
  const [battleAnimation, setBattleAnimation] = useState('');
  const [enemyAnimation, setEnemyAnimation] = useState('');

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
      { day: 140, title: "Deep Healing", text: "Your cells regenerate with newfound vigor. The damage of years past continues to reverse itself." },
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
    if (days === 0) return "🏰 Your quest begins now! Every moment counts.";
    if (days === 1) return "🫁 Your oxygen levels are improving!";
    if (days < 7) return "💓 Your heart rate is normalizing!";
    if (days < 30) return "🌟 Your energy levels are increasing!";
    if (days < 90) return "💪 Your lung function is improving significantly!";
    if (days < 365) return "🛡️ Your risk of heart disease is dropping!";
    return "👑 You're a legendary smoke-free hero!";
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
    // Time-Based Achievements (Days)
    { id: 'HOUR_1', title: 'The First Hour', description: 'One hour smoke-free!', icon: '⏰', hoursRequired: 1, experience: 10, rarity: 'common', category: 'time' },
    { id: 'HOUR_12', title: 'Half Day Hero', description: '12 hours smoke-free!', icon: '🌓', hoursRequired: 12, experience: 25, rarity: 'common', category: 'time' },
    { id: 'DAY_1', title: 'First Victory', description: 'Survived your first day!', icon: '🛡️', daysRequired: 1, experience: 100, rarity: 'common', category: 'time' },
    { id: 'DAY_3', title: 'Three Day Trial', description: '3 days smoke-free!', icon: '🥉', daysRequired: 3, experience: 200, rarity: 'common', category: 'time' },
    { id: 'WEEK_1', title: 'Weekly Warrior', description: 'One week of freedom!', icon: '⚔️', daysRequired: 7, experience: 500, rarity: 'uncommon', category: 'time' },
    { id: 'WEEK_2', title: 'Fortnight Fighter', description: 'Two weeks strong!', icon: '🏹', daysRequired: 14, experience: 750, rarity: 'uncommon', category: 'time' },
    { id: 'DAY_21', title: 'Habit Breaker', description: '21 days - new habits formed!', icon: '🔨', daysRequired: 21, experience: 900, rarity: 'uncommon', category: 'time' },
    { id: 'MONTH_1', title: 'Monthly Champion', description: 'A full month smoke-free!', icon: '🏆', daysRequired: 30, experience: 1000, rarity: 'rare', category: 'time' },
    { id: 'DAY_50', title: 'Half Century', description: '50 days of victory!', icon: '5️⃣0️⃣', daysRequired: 50, experience: 1500, rarity: 'rare', category: 'time' },
    { id: 'MONTH_2', title: 'Two Moon Warrior', description: 'Two months conquered!', icon: '🌙', daysRequired: 60, experience: 1800, rarity: 'rare', category: 'time' },
    { id: 'DAY_90', title: 'Season Master', description: '90 days - a full season!', icon: '🍂', daysRequired: 90, experience: 2200, rarity: 'rare', category: 'time' },
    { id: 'MILESTONE_100', title: 'Century Mark', description: '100 days of triumph!', icon: '💯', daysRequired: 100, experience: 2500, rarity: 'epic', category: 'time' },
    { id: 'MONTH_6', title: 'Half Year Hero', description: 'Six months smoke-free!', icon: '🌟', daysRequired: 180, experience: 5000, rarity: 'epic', category: 'time' },
    { id: 'DAY_300', title: 'Almost There', description: '300 days strong!', icon: '🎯', daysRequired: 300, experience: 7500, rarity: 'epic', category: 'time' },
    { id: 'YEAR_1', title: 'Dragon Slayer', description: 'One year smoke-free!', icon: '🐉', daysRequired: 365, experience: 10000, rarity: 'legendary', category: 'time' },
    { id: 'DAY_500', title: 'Eternal Warrior', description: '500 days of freedom!', icon: '♾️', daysRequired: 500, experience: 12500, rarity: 'legendary', category: 'time' },
    { id: 'YEAR_2', title: 'Legend Reborn', description: 'Two years smoke-free!', icon: '🔥', daysRequired: 730, experience: 20000, rarity: 'legendary', category: 'time' },
    { id: 'DAY_1000', title: 'Millennial Master', description: '1000 days - truly legendary!', icon: '🌌', daysRequired: 1000, experience: 25000, rarity: 'legendary', category: 'time' },
    
    // Money Saved Achievements
    { id: 'SAVE_10', title: 'Copper Collector', description: 'Saved $10!', icon: '🪙', moneySaved: 10, experience: 50, rarity: 'common', category: 'money' },
    { id: 'SAVE_25', title: 'Silver Saver', description: 'Saved $25!', icon: '🥈', moneySaved: 25, experience: 100, rarity: 'common', category: 'money' },
    { id: 'SAVE_50', title: 'Gold Getter', description: 'Saved $50!', icon: '🥇', moneySaved: 50, experience: 200, rarity: 'uncommon', category: 'money' },
    { id: 'SAVE_100', title: 'Treasure Hunter', description: 'Saved $100!', icon: '💰', moneySaved: 100, experience: 400, rarity: 'uncommon', category: 'money' },
    { id: 'SAVE_250', title: 'Vault Builder', description: 'Saved $250!', icon: '🏦', moneySaved: 250, experience: 750, rarity: 'rare', category: 'money' },
    { id: 'SAVE_500', title: 'Fortune Finder', description: 'Saved $500!', icon: '💎', moneySaved: 500, experience: 1500, rarity: 'rare', category: 'money' },
    { id: 'SAVE_1000', title: 'Wealth Warrior', description: 'Saved $1,000!', icon: '👑', moneySaved: 1000, experience: 3000, rarity: 'epic', category: 'money' },
    { id: 'SAVE_2500', title: 'Treasury Master', description: 'Saved $2,500!', icon: '🏰', moneySaved: 2500, experience: 6000, rarity: 'epic', category: 'money' },
    { id: 'SAVE_5000', title: 'Dragon\'s Hoard', description: 'Saved $5,000!', icon: '🐲', moneySaved: 5000, experience: 10000, rarity: 'legendary', category: 'money' },
    { id: 'SAVE_10000', title: 'Kingdom\'s Fortune', description: 'Saved $10,000!', icon: '🌍', moneySaved: 10000, experience: 20000, rarity: 'legendary', category: 'money' },
    
    // Battle Achievements
    { id: 'BATTLE_1', title: 'First Blood', description: 'Won your first battle!', icon: '🩸', battlesRequired: 1, experience: 50, rarity: 'common', category: 'battle' },
    { id: 'BATTLE_10', title: 'Craving Fighter', description: 'Defeated 10 cravings!', icon: '⚔️', battlesRequired: 10, experience: 300, rarity: 'uncommon', category: 'battle' },
    { id: 'BATTLE_50', title: 'Craving Slayer', description: 'Defeated 50 cravings!', icon: '🗡️', battlesRequired: 50, experience: 1500, rarity: 'rare', category: 'battle' },
    { id: 'BATTLE_100', title: 'Centurion', description: 'Won 100 battles!', icon: '🏛️', battlesRequired: 100, experience: 3000, rarity: 'epic', category: 'battle' },
    { id: 'PERFECT_10', title: 'Perfect Warrior', description: '10 flawless victories!', icon: '💫', perfectRequired: 10, experience: 1000, rarity: 'rare', category: 'battle' },
  ];

  const checkAchievements = (days) => {
    let newAchievements = [...userData.achievements];
    let totalExp = userData.totalExperience;
    
    // Calculate hours for hour-based achievements
    const hours = days * 24;
    
    achievementsList.forEach(achievement => {
      // Skip if already unlocked
      if (newAchievements.includes(achievement.id)) return;
      
      let shouldUnlock = false;
      
      // Check different achievement types
      if (achievement.hoursRequired && hours >= achievement.hoursRequired) {
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
  const enemyTypes = [
    { name: 'Nicotine Imp', hp: 60, attack: 8, defense: 5, xp: 50, icon: '👹', color: 'red', weakness: 'light' },
    { name: 'Smoke Specter', hp: 80, attack: 10, defense: 7, xp: 75, icon: '👻', color: 'gray', weakness: 'wind' },
    { name: 'Craving Demon', hp: 100, attack: 12, defense: 8, xp: 100, icon: '👺', color: 'purple', weakness: 'fire' },
    { name: 'Tar Monster', hp: 120, attack: 15, defense: 10, xp: 150, icon: '🦠', color: 'black', weakness: 'water' },
    { name: 'Addiction Dragon', hp: 150, attack: 18, defense: 12, xp: 200, icon: '🐲', color: 'orange', weakness: 'lightning' }
  ];

  const startBattle = (intensity = 'medium') => {
    let enemy;
    if (intensity === 'mild') {
      enemy = enemyTypes[Math.floor(Math.random() * 2)];
    } else if (intensity === 'strong') {
      enemy = enemyTypes[Math.floor(Math.random() * 2) + 3];
    } else {
      enemy = enemyTypes[2];
    }

    const playerMaxHP = 100 + (stats.knightLevel * 20);
    
    setBattleState({
      inBattle: true,
      currentEnemy: enemy,
      playerHP: playerMaxHP,
      enemyHP: enemy.hp,
      playerMaxHP: playerMaxHP,
      enemyMaxHP: enemy.hp,
      battleLog: [`A wild ${enemy.name} appears!`],
      playerTurn: true,
      battleReward: enemy.xp,
      comboCount: 0,
      specialCharge: 0,
      battlesWon: battleState.battlesWon,
      perfectVictories: battleState.perfectVictories
    });
    
    setCurrentScreen('battle');
  };

  const playerAttack = (attackType = 'normal') => {
    if (!battleState.playerTurn || !battleState.inBattle) return;
    
    let damage = 10 + (stats.knightLevel * 5);
    let message = '';
    
    setBattleAnimation('player-attack');
    setTimeout(() => setBattleAnimation(''), 500);
    
    if (attackType === 'normal') {
      damage = Math.floor(damage + Math.random() * 10);
      message = `${userData.heroName} attacks for ${damage} damage!`;
    } else if (attackType === 'special') {
      if (battleState.specialCharge < 100) return;
      
      if (userData.avatarClass === 'warrior') {
        damage = Math.floor(damage * 2.5);
        message = `${userData.heroName} uses MIGHTY STRIKE for ${damage} damage!`;
      } else if (userData.avatarClass === 'mage') {
        damage = Math.floor(damage * 2);
        message = `${userData.heroName} casts FIREBALL for ${damage} damage!`;
      } else {
        damage = Math.floor(damage * 1.8);
        message = `${userData.heroName} uses SHADOW STRIKE for ${damage} damage! CRITICAL!`;
      }
      
      setBattleState(prev => ({ ...prev, specialCharge: 0 }));
    } else if (attackType === 'defend') {
      message = `${userData.heroName} takes a defensive stance!`;
      damage = 0;
    }
    
    const newEnemyHP = Math.max(0, battleState.enemyHP - damage);
    const newCombo = damage > 0 ? battleState.comboCount + 1 : 0;
    const newSpecialCharge = Math.min(100, battleState.specialCharge + 20);
    
    setBattleState(prev => ({
      ...prev,
      enemyHP: newEnemyHP,
      battleLog: [...prev.battleLog, message],
      playerTurn: false,
      comboCount: newCombo,
      specialCharge: attackType !== 'special' ? newSpecialCharge : prev.specialCharge
    }));
    
    if (newEnemyHP <= 0) {
      setTimeout(() => winBattle(), 1000);
    } else {
      setTimeout(() => enemyAttack(), 1500);
    }
  };

  const enemyAttack = () => {
    if (!battleState.inBattle) return;
    
    setEnemyAnimation('enemy-attack');
    setTimeout(() => setEnemyAnimation(''), 500);
    
    const damage = Math.floor(battleState.currentEnemy.attack + Math.random() * 8);
    const newPlayerHP = Math.max(0, battleState.playerHP - damage);
    
    setBattleState(prev => ({
      ...prev,
      playerHP: newPlayerHP,
      battleLog: [...prev.battleLog, `${prev.currentEnemy.name} attacks for ${damage} damage!`],
      playerTurn: true
    }));
    
    if (newPlayerHP <= 0) {
      setTimeout(() => loseBattle(), 1000);
    }
  };

  const usePotion = () => {
    if (!battleState.playerTurn || !battleState.inBattle) return;
    
    const healAmount = 50;
    const newPlayerHP = Math.min(battleState.playerMaxHP, battleState.playerHP + healAmount);
    
    setBattleAnimation('heal');
    setTimeout(() => setBattleAnimation(''), 1000);
    
    setBattleState(prev => ({
      ...prev,
      playerHP: newPlayerHP,
      battleLog: [...prev.battleLog, `${userData.heroName} uses a health potion and heals ${healAmount} HP!`],
      playerTurn: false
    }));
    
    setTimeout(() => enemyAttack(), 1500);
  };

  const winBattle = () => {
    const isPerfect = battleState.playerHP === battleState.playerMaxHP;
    const xpGained = battleState.battleReward + (battleState.comboCount * 10);
    
    setBattleState(prev => ({
      ...prev,
      inBattle: false,
      battleLog: [...prev.battleLog, `VICTORY! You defeated the ${prev.currentEnemy.name}!`, `Gained ${xpGained} XP!`],
      battlesWon: prev.battlesWon + 1,
      perfectVictories: isPerfect ? prev.perfectVictories + 1 : prev.perfectVictories
    }));
    
    setUserData(prev => ({
      ...prev,
      totalExperience: prev.totalExperience + xpGained,
      battlesWon: prev.battlesWon + 1,
      cravingsDefeated: prev.cravingsDefeated + 1
    }));
    
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 3000);
  };

  const loseBattle = () => {
    setBattleState(prev => ({
      ...prev,
      inBattle: false,
      battleLog: [...prev.battleLog, `Defeated... But don't give up! Every battle makes you stronger!`]
    }));
  };

  const fleeBattle = () => {
    setBattleState(prev => ({
      ...prev,
      inBattle: false,
      battleLog: [...prev.battleLog, `You fled from battle. Sometimes retreat is wisdom!`]
    }));
    setCurrentScreen('dashboard');
  };

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

  const validateStep = () => {
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
  };

  const nextStep = () => {
    if (validateStep()) {
      if (setupStep < 5) {
        setSetupStep(setupStep + 1);
      } else {
        handleSetupSubmit();
      }
    }
  };

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
    }
  };

  // Character Avatar Component with 16-bit style
  const CharacterAvatar = ({ level, className, size = 'large', animate = false }) => {
    const getPixelArt = () => {
      const baseClass = className || userData.avatarClass;
      const pixelSprites = {
        warrior: [
          '⬜⬜⬛⬛⬛⬜⬜\n⬜⬛🟨🟨🟨⬛⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🟥🟥🟥🟥🟥⬜\n🟫🟥🟥🟥🟥🟥🟫\n⬜🟫🟥🟥🟥🟫⬜',
          '⬜⬜🟦🟦🟦⬜⬜\n⬜🟦🟨🟨🟨🟦⬜\n⬜🟦👁️⬜👁️🟦⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🟦🟦🟦🟦🟦⬜\n🟫🟦🟦🟦🟦🟦🟫\n⬜🟫🟦🟦🟦🟫⬜',
          '⬜⬜🟪🟪🟪⬜⬜\n⬜🟪🟨🟨🟨🟪⬜\n⬜🟪👁️⬜👁️🟪⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🟪🟪🟪🟪🟪⬜\n🟫🟪🟪🟪🟪🟪🟫\n⬜🟫🟪🟪🟪🟫⬜',
          '⬜👑👑👑👑👑⬜\n⬜🟨🟨🟨🟨🟨⬜\n⬜🟨👁️⬜👁️🟨⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🟨🟨🟨🟨🟨⬜\n🟫🟨🟨🟨🟨🟨🟫\n⬜🟫🟨🟨🟨🟫⬜',
          '⬜👑👑👑👑👑⬜\n⬜🔥🟨🟨🟨🔥⬜\n⬜🔥👁️⬜👁️🔥⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🔥🔥🔥🔥🔥⬜\n🟫🔥🔥🔥🔥🔥🟫\n⬜🟫🔥🔥🔥🟫⬜'
        ],
        mage: [
          '⬜⬜🟣🟣🟣⬜⬜\n⬜🟣⬜⬜⬜🟣⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🔵🔵🔵🔵🔵⬜\n⬜🔵🔵🔵🔵🔵⬜\n⬜⬜🔵🔵🔵⬜⬜',
          '⬜🔮🔮🔮🔮🔮⬜\n⬜🟣⬜⬜⬜🟣⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🔵🔵🔵🔵🔵⬜\n⬜🔵🔵🔵🔵🔵⬜\n⬜⬜🔵🔵🔵⬜⬜',
          '⬜✨✨✨✨✨⬜\n⬜🟣⬜⬜⬜🟣⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🟣🟣🟣🟣🟣⬜\n⬜🟣🟣🟣🟣🟣⬜\n⬜⬜🟣🟣🟣⬜⬜',
          '⬜⭐⭐⭐⭐⭐⬜\n⬜💜⬜⬜⬜💜⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜💜💜💜💜💜⬜\n⬜💜💜💜💜💜⬜\n⬜⬜💜💜💜⬜⬜',
          '⬜🌟🌟🌟🌟🌟⬜\n⬜🔥⬜⬜⬜🔥⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🔥🔥🔥🔥🔥⬜\n⬜🔥🔥🔥🔥🔥⬜\n⬜⬜🔥🔥🔥⬜⬜'
        ],
        rogue: [
          '⬜⬜⬛⬛⬛⬜⬜\n⬜⬛⬜⬜⬜⬛⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜⬛⬛⬛⬛⬛⬜\n⬜⬛⬛⬛⬛⬛⬜\n⬜⬜⬛⬛⬛⬜⬜',
          '⬜⬜🟫🟫🟫⬜⬜\n⬜🟫⬜⬜⬜🟫⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🟫🟫🟫🟫🟫⬜\n⬜🟫🟫🟫🟫🟫⬜\n⬜⬜🟫🟫🟫⬜⬜',
          '⬜⬜🌑🌑🌑⬜⬜\n⬜🌑⬜⬜⬜🌑⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🌑🌑🌑🌑🌑⬜\n⬜🌑🌑🌑🌑🌑⬜\n⬜⬜🌑🌑🌑⬜⬜',
          '⬜🎩🎩🎩🎩🎩⬜\n⬜⚫⬜⬜⬜⚫⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜⚫⚫⚫⚫⚫⬜\n⬜⚫⚫⚫⚫⚫⬜\n⬜⬜⚫⚫⚫⬜⬜',
          '⬜👑👑👑👑👑⬜\n⬜🔥⬜⬜⬜🔥⬜\n⬜⬛👁️⬜👁️⬛⬜\n⬜⬛⬜👃⬜⬛⬜\n⬜🔥🔥🔥🔥🔥⬜\n⬜🔥🔥🔥🔥🔥⬜\n⬜⬜🔥🔥🔥⬜⬜'
        ]
      };
      
      return pixelSprites[baseClass][Math.min(level - 1, 4)];
    };
    
    const sizeClasses = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base'
    };
    
    return (
      <div className={`relative inline-block ${animate ? 'animate-bounce' : ''}`}>
        <div className={`${sizeClasses[size]} font-mono leading-none select-none pixelated`}>
          <pre className="m-0 p-2 bg-black bg-opacity-20 rounded">
            {getPixelArt()}
          </pre>
        </div>
        
        {/* Level badge */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full font-bold pixelated">
            LV.{level}
          </span>
        </div>
      </div>
    );
  };

  // Particle Effects Component
  const ParticleEffect = () => {
    if (!showParticles) return null;
    
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
            <Sparkles className="text-yellow-400 w-6 h-6" />
          </div>
        ))}
      </div>
    );
  };

  // Level Up Animation
  const LevelUpAnimation = () => {
    if (!isLevelingUp) return null;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
        <div className="bg-yellow-600 text-slate-900 px-8 py-4 rounded-lg animate-scale-up pixelated">
          <h2 className="text-3xl font-bold">LEVEL UP!</h2>
          <p className="text-center mt-2">Knight Level {stats.knightLevel}</p>
        </div>
      </div>
    );
  };

  // Pixel Background Component
  const PixelBackground = ({ environment = 'forest' }) => {
    const backgrounds = {
      forest: '🌲🌳🌲🌳🌲',
      mountain: '🏔️⛰️🏔️⛰️🏔️',
      castle: '🏰🏯🏰🏯🏰',
      dungeon: '⬛🟫⬛🟫⬛',
      dragon: '🌋🔥🌋🔥🌋'
    };
    
    return (
      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
        <div className="text-6xl leading-none">
          {[...Array(20)].map((_, i) => (
            <div key={i}>{backgrounds[environment]}</div>
          ))}
        </div>
      </div>
    );
  };

  // Story Screen Component
  const StoryScreen = () => {
    const [selectedDay, setSelectedDay] = useState(stats.daysSmokeFree || 1);
    const [viewMode, setViewMode] = useState('today'); // 'today', 'archive', 'map'
    
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
    
    return (
      <div className="space-y-4">
        {/* Story Header */}
        <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 border-4 border-purple-700 rounded-lg p-6 relative overflow-hidden">
          <PixelBackground environment={
            storyChapter <= 2 ? 'forest' :
            storyChapter <= 4 ? 'mountain' :
            storyChapter <= 6 ? 'castle' :
            'dragon'
          } />
          
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-yellow-400 text-center mb-4 pixelated">
              📜 THE LEGEND OF {userData.heroName.toUpperCase()} 📜
            </h2>
            <p className="text-purple-200 text-center pixelated text-xs">
              Chapter {storyChapter}: Day {stats.daysSmokeFree} of Your Epic Journey
            </p>
            
            {/* View Mode Tabs */}
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setViewMode('today')}
                className={`px-3 py-1 rounded pixelated text-xs ${
                  viewMode === 'today' 
                    ? 'bg-yellow-500 text-slate-900' 
                    : 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                }`}
              >
                Today's Story
              </button>
              <button
                onClick={() => setViewMode('archive')}
                className={`px-3 py-1 rounded pixelated text-xs ${
                  viewMode === 'archive' 
                    ? 'bg-yellow-500 text-slate-900' 
                    : 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                }`}
              >
                Story Archive
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 rounded pixelated text-xs ${
                  viewMode === 'map' 
                    ? 'bg-yellow-500 text-slate-900' 
                    : 'bg-purple-800 text-purple-200 hover:bg-purple-700'
                }`}
              >
                Journey Map
              </button>
            </div>
          </div>
        </div>

        {/* Today's Story View */}
        {viewMode === 'today' && currentStory && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-700 rounded-lg p-6">
            <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-4 mb-4">
              <h3 className="text-2xl font-bold text-yellow-400 mb-4 pixelated text-center">
                {currentStory.title}
              </h3>
              <div className="bg-slate-900 bg-opacity-50 rounded p-4">
                <p className="text-gray-200 leading-relaxed text-sm" style={{ fontFamily: 'Georgia, serif', lineHeight: '1.8' }}>
                  {currentStory.text.replace('{heroName}', userData.heroName)}
                </p>
              </div>
            </div>
            
            {/* Story Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-purple-900 bg-opacity-50 rounded p-2">
                <p className="text-purple-300 text-xs pixelated">Stories Read</p>
                <p className="text-yellow-400 text-lg font-bold pixelated">{availableStories.length}</p>
              </div>
              <div className="bg-purple-900 bg-opacity-50 rounded p-2">
                <p className="text-purple-300 text-xs pixelated">Chapter</p>
                <p className="text-yellow-400 text-lg font-bold pixelated">{storyChapter}</p>
              </div>
              <div className="bg-purple-900 bg-opacity-50 rounded p-2">
                <p className="text-purple-300 text-xs pixelated">Days Total</p>
                <p className="text-yellow-400 text-lg font-bold pixelated">{stats.daysSmokeFree}</p>
              </div>
            </div>
            
            {!todayStoryViewed && stats.daysSmokeFree === currentStory.day && (
              <div className="mt-4 text-center">
                <span className="text-yellow-400 animate-pulse pixelated text-sm">✨ New chapter unlocked! ✨</span>
              </div>
            )}
          </div>
        )}

        {/* Story Archive View */}
        {viewMode === 'archive' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-4 pixelated text-center">
              📚 YOUR STORY COLLECTION
            </h3>
            
            {/* Day Selector */}
            <div className="mb-4">
              <label className="text-yellow-400 text-xs pixelated block mb-2">Select Day to Read:</label>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                  disabled={selectedDay <= 1}
                  className="px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:opacity-50 text-white rounded pixelated"
                >
                  ←
                </button>
                <input
                  type="number"
                  value={selectedDay}
                  onChange={(e) => {
                    const day = Math.min(stats.daysSmokeFree, Math.max(1, parseInt(e.target.value) || 1));
                    setSelectedDay(day);
                  }}
                  min="1"
                  max={stats.daysSmokeFree}
                  className="w-20 p-1 bg-slate-700 border-2 border-slate-600 rounded text-white text-center pixelated"
                />
                <button
                  onClick={() => setSelectedDay(Math.min(stats.daysSmokeFree, selectedDay + 1))}
                  disabled={selectedDay >= stats.daysSmokeFree}
                  className="px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:opacity-50 text-white rounded pixelated"
                >
                  →
                </button>
                <span className="text-gray-400 text-xs pixelated">of {stats.daysSmokeFree} days</span>
              </div>
            </div>
            
            {/* Selected Story Display */}
            <div className="bg-yellow-900 bg-opacity-30 rounded-lg p-4">
              <h4 className="text-xl font-bold text-yellow-400 mb-3 pixelated">
                Day {selectedDay}: {selectedStory.title}
              </h4>
              <div className="bg-slate-900 bg-opacity-50 rounded p-4">
                <p className="text-gray-200 leading-relaxed text-sm" style={{ fontFamily: 'Georgia, serif', lineHeight: '1.8' }}>
                  {selectedStory.text}
                </p>
              </div>
              {selectedStory.day > 0 && (
                <p className="text-yellow-500 text-xs text-center mt-3 pixelated">
                  {selectedStory.day <= 30 ? 'Chapter 1: The Awakening' :
                   selectedStory.day <= 60 ? 'Chapter 2: The Journey' :
                   selectedStory.day <= 90 ? 'Chapter 3: The Trials' :
                   selectedStory.day <= 120 ? 'Chapter 4: The Transformation' :
                   selectedStory.day <= 150 ? 'Chapter 5: The Mastery' :
                   'Chapter 6: The Legend'}
                </p>
              )}
            </div>
            
            {/* Quick Jump to Milestone Days */}
            <div className="mt-4">
              <p className="text-yellow-400 text-xs pixelated mb-2">Quick Jump to Milestones:</p>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7, 14, 21, 30, 50, 60, 90, 100, 120, 150, 180, 365].map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    disabled={day > stats.daysSmokeFree}
                    className={`px-2 py-1 rounded text-xs pixelated ${
                      day <= stats.daysSmokeFree
                        ? 'bg-purple-700 hover:bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Day {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Journey Map View */}
        {viewMode === 'map' && (
          <div className="bg-gradient-to-br from-amber-900 to-amber-800 border-4 border-amber-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-amber-300 mb-4 pixelated text-center">
              🗺️ YOUR HEROIC JOURNEY
            </h3>
            
            {/* Chapter Progress */}
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className={`p-2 rounded ${storyChapter >= 1 ? 'bg-green-700' : 'bg-gray-700'}`}>
                  <p className="text-xs text-white pixelated">Ch.1: Awakening</p>
                  <p className="text-yellow-400 font-bold pixelated">Days 1-30</p>
                </div>
                <div className={`p-2 rounded ${storyChapter >= 2 ? 'bg-green-700' : 'bg-gray-700'}`}>
                  <p className="text-xs text-white pixelated">Ch.2: Journey</p>
                  <p className="text-yellow-400 font-bold pixelated">Days 31-60</p>
                </div>
                <div className={`p-2 rounded ${storyChapter >= 3 ? 'bg-green-700' : 'bg-gray-700'}`}>
                  <p className="text-xs text-white pixelated">Ch.3: Trials</p>
                  <p className="text-yellow-400 font-bold pixelated">Days 61-90</p>
                </div>
                <div className={`p-2 rounded ${storyChapter >= 4 ? 'bg-green-700' : 'bg-gray-700'}`}>
                  <p className="text-xs text-white pixelated">Ch.4: Transform</p>
                  <p className="text-yellow-400 font-bold pixelated">Days 91-120</p>
                </div>
                <div className={`p-2 rounded ${storyChapter >= 5 ? 'bg-green-700' : 'bg-gray-700'}`}>
                  <p className="text-xs text-white pixelated">Ch.5: Mastery</p>
                  <p className="text-yellow-400 font-bold pixelated">Days 121-150</p>
                </div>
                <div className={`p-2 rounded ${storyChapter >= 6 ? 'bg-green-700' : 'bg-gray-700'}`}>
                  <p className="text-xs text-white pixelated">Ch.6: Legend</p>
                  <p className="text-yellow-400 font-bold pixelated">Days 151-180</p>
                </div>
              </div>
            </div>
            
            {/* Interactive Day Grid */}
            <div className="bg-slate-900 bg-opacity-50 rounded p-4">
              <p className="text-amber-300 text-xs pixelated mb-2">Click any unlocked day to read its story:</p>
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
                      className={`
                        h-8 rounded flex items-center justify-center text-xs font-bold pixelated transition-all
                        ${isCurrent ? 'bg-yellow-500 text-slate-900 animate-pulse ring-2 ring-yellow-300' :
                          isUnlocked ? (hasStory ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer' : 'bg-blue-700 hover:bg-blue-600 text-blue-200 cursor-pointer') :
                          hasStory ? 'bg-amber-800 text-amber-600 cursor-not-allowed' :
                          'bg-gray-700 text-gray-500 cursor-not-allowed'}
                      `}
                      title={
                        isUnlocked ? `Day ${day} - Click to read` : 
                        `Day ${day} - Locked (${day - stats.daysSmokeFree} days to unlock)`
                      }
                    >
                      {hasStory && isUnlocked ? '📜' : day}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex justify-around text-xs pixelated">
              <span className="text-green-400">📜 Story Day ({availableStories.length})</span>
              <span className="text-blue-400">✓ Completed Day</span>
              <span className="text-yellow-400 animate-pulse">★ Today</span>
              <span className="text-gray-400">🔒 Locked</span>
            </div>
            
            {/* Progress Summary */}
            <div className="mt-4 bg-slate-900 bg-opacity-50 rounded p-3 text-center">
              <p className="text-amber-300 pixelated text-sm">
                You've unlocked {availableStories.length} of {storyContent.chapters.filter(ch => ch.day > 0).length} story entries
              </p>
              <div className="w-full bg-amber-800 rounded-full h-3 mt-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-yellow-500 h-3 rounded-full transition-all"
                  style={{ width: `${(stats.daysSmokeFree / 180) * 100}%` }}
                />
              </div>
              <p className="text-amber-400 text-xs mt-1 pixelated">
                {Math.round((stats.daysSmokeFree / 180) * 100)}% of 6-month journey complete
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Setup Screen Component
  const SetupScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 p-6 relative">
      <PixelBackground environment="castle" />
      
      <div className="max-w-md mx-auto relative z-10">
        {/* Animated stars background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`
              }}
            >
              ⭐
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-yellow-600 to-amber-600 border-4 border-yellow-500 rounded-lg p-6 mb-6 shadow-2xl relative overflow-hidden pixelated">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"></div>
          <h1 className="text-3xl font-bold text-slate-900 text-center mb-2 relative z-10">🏰 QUIT QUEST</h1>
          <p className="text-slate-800 text-center relative z-10">Begin your legendary smoke-free adventure!</p>
        </div>

        <div className="bg-slate-800 border-4 border-slate-700 rounded-lg p-6 mb-4 backdrop-blur-lg bg-opacity-90">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-yellow-500 text-sm pixelated">Quest Setup Progress</span>
              <span className="text-gray-400 text-sm pixelated">Step {setupStep} of 5</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-500 to-amber-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(setupStep / 5) * 100}%` }}
              />
            </div>
          </div>

          {setupStep === 1 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-yellow-500 mb-4 pixelated">🏰 CREATE YOUR HERO</h2>
              <p className="text-gray-300 mb-6">What shall we call you on this quest?</p>
              <input
                type="text"
                placeholder="Enter your hero name"
                value={setupForm.heroName}
                onChange={(e) => setSetupForm({...setupForm, heroName: e.target.value})}
                className="w-full p-3 bg-slate-700 border-2 border-slate-600 rounded text-white text-center focus:border-yellow-500 focus:outline-none transition-colors pixelated"
                maxLength={20}
              />
              <p className="text-gray-500 text-sm mt-2">Choose a name that inspires you!</p>
            </div>
          )}

          {setupStep === 2 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-yellow-500 mb-4 pixelated">⚔️ CHOOSE YOUR CLASS</h2>
              <p className="text-gray-300 mb-6">Select your hero's class</p>
              <div className="space-y-3">
                {[
                  { id: 'warrior', name: 'Warrior', icon: '🛡️', desc: 'Strong and resilient' },
                  { id: 'mage', name: 'Mage', icon: '🔮', desc: 'Wise and mystical' },
                  { id: 'rogue', name: 'Rogue', icon: '🗡️', desc: 'Swift and cunning' }
                ].map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setSetupForm({...setupForm, avatarClass: cls.id})}
                    className={`w-full p-4 rounded-lg border-2 transition-all pixelated ${
                      setupForm.avatarClass === cls.id
                        ? 'bg-yellow-600 border-yellow-500 text-slate-900'
                        : 'bg-slate-700 border-slate-600 text-white hover:border-yellow-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cls.icon}</span>
                        <div className="text-left">
                          <p className="font-bold">{cls.name}</p>
                          <p className="text-sm opacity-80">{cls.desc}</p>
                        </div>
                      </div>
                      {setupForm.avatarClass === cls.id && <span>✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {setupStep === 3 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-yellow-500 mb-4 pixelated">📅 QUIT DATE</h2>
              <p className="text-gray-300 mb-6">When did you start your smoke-free journey?</p>
              <input
                type="date"
                value={setupForm.quitDate}
                onChange={(e) => setSetupForm({...setupForm, quitDate: e.target.value})}
                max={new Date().toISOString().split('T')[0]}
                className="w-full p-3 bg-slate-700 border-2 border-slate-600 rounded text-white text-center focus:border-yellow-500 focus:outline-none transition-colors pixelated"
              />
              <p className="text-gray-500 text-sm mt-2">This can be today or a past date</p>
            </div>
          )}

          {setupStep === 4 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-yellow-500 mb-4 pixelated">🚬 DAILY HABIT</h2>
              <p className="text-gray-300 mb-6">How many cigarettes did you smoke per day?</p>
              <input
                type="number"
                placeholder="20"
                value={setupForm.cigarettesPerDay}
                onChange={(e) => setSetupForm({...setupForm, cigarettesPerDay: e.target.value})}
                min="1"
                max="100"
                className="w-full p-3 bg-slate-700 border-2 border-slate-600 rounded text-white text-center focus:border-yellow-500 focus:outline-none transition-colors pixelated"
              />
              <p className="text-gray-500 text-sm mt-2">Be honest - we'll track your victories!</p>
            </div>
          )}

          {setupStep === 5 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-yellow-500 mb-4 pixelated">💰 COST PER PACK</h2>
              <p className="text-gray-300 mb-6">How much did you spend on a pack?</p>
              <input
                type="number"
                placeholder="12.50"
                value={setupForm.pricePerPack}
                onChange={(e) => setSetupForm({...setupForm, pricePerPack: e.target.value})}
                min="0.01"
                max="100"
                step="0.01"
                className="w-full p-3 bg-slate-700 border-2 border-slate-600 rounded text-white text-center focus:border-yellow-500 focus:outline-none transition-colors pixelated"
              />
              <p className="text-gray-500 text-sm mt-2">We'll track your gold savings!</p>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {setupStep > 1 && (
              <button
                onClick={() => setSetupStep(setupStep - 1)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border-2 border-slate-600 transition-all transform hover:scale-105 pixelated"
              >
                Previous
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={!validateStep()}
              className={`flex-1 py-3 rounded-lg border-2 transition-all transform hover:scale-105 pixelated ${
                validateStep() 
                  ? setupStep === 5 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border-green-500 text-white' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-blue-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-gray-500 cursor-not-allowed'
              }`}
            >
              {setupStep === 5 ? '⚔️ Begin Quest!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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
    
    return (
      <div className="space-y-4 relative">
        <PixelBackground environment={
          stats.knightLevel === 1 ? 'forest' :
          stats.knightLevel === 2 ? 'forest' :
          stats.knightLevel === 3 ? 'mountain' :
          stats.knightLevel === 4 ? 'castle' :
          'dragon'
        } />
        
        {/* Story Alert if new story available */}
        {userData.storyProgress.includes(stats.daysSmokeFree) && !todayStoryViewed && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 border-4 border-purple-500 rounded-lg p-3 text-center animate-pulse">
            <p className="text-white font-bold pixelated">📜 New Story Chapter Unlocked! 📜</p>
            <button
              onClick={() => setCurrentScreen('story')}
              className="mt-2 px-4 py-1 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded font-bold transition-all pixelated"
            >
              Read Now
            </button>
          </div>
        )}
        
        {/* Craving Emergency Button */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 border-4 border-red-500 rounded-lg p-4 text-center animate-pulse-slow relative z-10">
          <h3 className="text-white font-bold mb-2 pixelated">🚨 CRAVING EMERGENCY? 🚨</h3>
          <p className="text-red-100 text-sm mb-3">Fight the urge with an epic battle!</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => startBattle('mild')}
              className="py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-lg font-bold transition-all transform hover:scale-105 pixelated"
            >
              Mild
            </button>
            <button
              onClick={() => startBattle('medium')}
              className="py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-bold transition-all transform hover:scale-105 pixelated"
            >
              Medium
            </button>
            <button
              onClick={() => startBattle('strong')}
              className="py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all transform hover:scale-105 pixelated"
            >
              Strong
            </button>
          </div>
        </div>

        {/* Hero Card with Avatar */}
        <div className="bg-gradient-to-br from-yellow-600 to-amber-600 border-4 border-yellow-500 rounded-lg p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-shimmer"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                <CharacterAvatar level={stats.knightLevel} size="large" animate={isLevelingUp} />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 pixelated">{userData.heroName}</h2>
                  <p className="text-slate-800 pixelated">Level {stats.knightLevel} {userData.avatarClass}</p>
                  <div className="mt-2">
                    <p className="text-4xl font-bold text-slate-900 pixelated">{stats.daysSmokeFree}</p>
                    <p className="text-sm text-slate-800 pixelated">DAYS SMOKE-FREE</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Swords className="w-4 h-4 text-slate-800" />
                    <span className="text-sm text-slate-800 pixelated">Battles Won: {userData.battlesWon}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Health & XP Bars */}
            <div className="space-y-2 mt-4">
              <div>
                <div className="flex justify-between text-xs text-slate-800 mb-1 pixelated">
                  <span>Health</span>
                  <span>{Math.round(stats.healthPercentage)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-pink-500 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${stats.healthPercentage}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs text-slate-800 mb-1 pixelated">
                  <span>Experience</span>
                  <span>{stats.experienceToNext} to next level</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${((userData.totalExperience % 500) / 500) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Card */}
        <div className={`rounded-lg p-4 border-4 relative z-10 ${
          stats.knightLevel === 1 ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600' :
          stats.knightLevel === 2 ? 'bg-gradient-to-br from-green-700 to-green-800 border-green-600' :
          stats.knightLevel === 3 ? 'bg-gradient-to-br from-blue-700 to-blue-800 border-blue-600' :
          stats.knightLevel === 4 ? 'bg-gradient-to-br from-purple-700 to-purple-800 border-purple-600' :
          'bg-gradient-to-br from-orange-700 to-red-800 border-orange-600'
        }`}>
          <p className="text-white text-center text-sm pixelated">
            {stats.knightLevel === 1 ? '🏚️ The Humble Beginning - Forest Path' :
             stats.knightLevel === 2 ? '🌲 The Enchanted Forest - Growing Stronger' :
             stats.knightLevel === 3 ? '🏔️ The Mountain Peak - Rising Above' :
             stats.knightLevel === 4 ? '🏰 The Royal Castle - Nearly There' :
             '🌋 The Dragon\'s Lair - Ultimate Power'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-gradient-to-br from-yellow-600 to-amber-600 border-4 border-yellow-500 rounded-lg p-4 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-900" />
            <p className="text-sm text-slate-800 pixelated">GOLD SAVED</p>
            <p className="text-2xl font-bold text-slate-900 pixelated">${stats.moneySaved.toFixed(2)}</p>
            <div className="mt-2 flex justify-center gap-1">
              {[...Array(Math.min(5, Math.floor(stats.moneySaved / 100)))].map((_, i) => (
                <span key={i} className="text-yellow-300">💰</span>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-700 to-amber-800 border-4 border-amber-600 rounded-lg p-4 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <Shield className="w-8 h-8 mx-auto mb-2 text-amber-100" />
            <p className="text-sm text-amber-200 pixelated">ENEMIES DEFEATED</p>
            <p className="text-2xl font-bold text-white pixelated">{stats.cigarettesAvoided.toLocaleString()}</p>
            <div className="mt-2 flex justify-center gap-1">
              {[...Array(Math.min(5, Math.floor(stats.cigarettesAvoided / 500)))].map((_, i) => (
                <span key={i}>💀</span>
              ))}
            </div>
          </div>
        </div>

        {/* Real-World Activities Section */}
        <div className="bg-gradient-to-br from-green-800 to-green-900 border-4 border-green-700 rounded-lg p-4 relative z-10">
          <h3 className="text-xl font-bold text-green-300 mb-3 flex items-center gap-2 pixelated">
            <Activity className="w-5 h-5" /> HEALTHY ACTIVITIES
          </h3>
          <p className="text-green-200 text-sm mb-3">Log activities to earn achievements!</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => logActivity('walk')}
              className="py-2 px-1 bg-green-700 hover:bg-green-600 text-green-100 rounded text-xs font-bold transition-all transform hover:scale-105 pixelated"
            >
              🚶 Walk
            </button>
            <button
              onClick={() => logActivity('exercise')}
              className="py-2 px-1 bg-green-700 hover:bg-green-600 text-green-100 rounded text-xs font-bold transition-all transform hover:scale-105 pixelated"
            >
              💪 Exercise
            </button>
            <button
              onClick={() => logActivity('meditate')}
              className="py-2 px-1 bg-green-700 hover:bg-green-600 text-green-100 rounded text-xs font-bold transition-all transform hover:scale-105 pixelated"
            >
              🧘 Meditate
            </button>
            <button
              onClick={() => logActivity('water')}
              className="py-2 px-1 bg-green-700 hover:bg-green-600 text-green-100 rounded text-xs font-bold transition-all transform hover:scale-105 pixelated"
            >
              💧 Water
            </button>
          </div>
        </div>

        {/* Health Status */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-700 rounded-lg p-6 relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 opacity-20">
            <Heart className="w-20 h-20 text-red-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-yellow-500 mb-3 flex items-center gap-2 relative z-10 pixelated">
            <Heart className="w-5 h-5" /> HEALTH STATUS
          </h3>
          <p className="text-gray-300 relative z-10">{stats.healthStatus}</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {stats.daysSmokeFree >= 1 && <span className="text-2xl animate-bounce-slow">🫁</span>}
            {stats.daysSmokeFree >= 7 && <span className="text-2xl animate-bounce-slow" style={{animationDelay: '0.1s'}}>💓</span>}
            {stats.daysSmokeFree >= 30 && <span className="text-2xl animate-bounce-slow" style={{animationDelay: '0.2s'}}>💪</span>}
            {stats.daysSmokeFree >= 100 && <span className="text-2xl animate-bounce-slow" style={{animationDelay: '0.3s'}}>🛡️</span>}
          </div>
        </div>
      </div>
    );
  };

  // Battle Screen Component
  const BattleScreen = () => {
    if (!battleState.currentEnemy) return null;
    
    return (
      <div className="space-y-4">
        {/* Battle Arena */}
        <div className="bg-gradient-to-br from-red-900 to-purple-900 border-4 border-red-700 rounded-lg p-6 relative overflow-hidden">
          <PixelBackground environment="dungeon" />
          
          {/* Battle Status */}
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-yellow-500 text-center mb-4 pixelated">⚔️ BATTLE MODE ⚔️</h2>
            
            {/* Enemy Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-400 font-bold pixelated">{battleState.currentEnemy.name}</span>
                <span className="text-white pixelated">{battleState.enemyHP}/{battleState.enemyMaxHP} HP</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-red-600 to-red-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${(battleState.enemyHP / battleState.enemyMaxHP) * 100}%` }}
                />
              </div>
              
              {/* Enemy Avatar */}
              <div className={`text-center mt-4 ${enemyAnimation}`}>
                <span className="text-7xl inline-block">
                  {battleState.currentEnemy.icon}
                </span>
              </div>
            </div>
            
            {/* VS Divider */}
            <div className="text-center my-4">
              <span className="text-yellow-400 text-2xl font-bold pixelated">⚡ VS ⚡</span>
            </div>
            
            {/* Player Section */}
            <div className="mb-6">
              <div className={`text-center mb-4 ${battleAnimation}`}>
                <CharacterAvatar level={stats.knightLevel} size="medium" />
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-bold pixelated">{userData.heroName}</span>
                <span className="text-white pixelated">{battleState.playerHP}/{battleState.playerMaxHP} HP</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-green-600 to-green-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${(battleState.playerHP / battleState.playerMaxHP) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Battle Actions */}
        {battleState.inBattle ? (
          <div className="bg-slate-800 border-4 border-slate-700 rounded-lg p-4">
            <h3 className="text-yellow-500 font-bold mb-3 pixelated">Your Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => playerAttack('normal')}
                disabled={!battleState.playerTurn}
                className={`py-3 px-4 rounded-lg border-2 transition-all pixelated ${
                  battleState.playerTurn 
                    ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white transform hover:scale-105' 
                    : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Sword className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm">Attack</span>
              </button>
              
              <button
                onClick={() => playerAttack('special')}
                disabled={!battleState.playerTurn || battleState.specialCharge < 100}
                className={`py-3 px-4 rounded-lg border-2 transition-all pixelated ${
                  battleState.playerTurn && battleState.specialCharge >= 100
                    ? 'bg-yellow-600 hover:bg-yellow-500 border-yellow-500 text-white transform hover:scale-105 animate-pulse' 
                    : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Zap className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm">Special</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 border-4 border-slate-700 rounded-lg p-4 text-center">
            <p className="text-yellow-400 font-bold mb-3 pixelated">
              {battleState.battleLog[battleState.battleLog.length - 1]}
            </p>
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="py-3 px-6 bg-green-600 hover:bg-green-500 text-white rounded-lg border-2 border-green-500 transition-all transform hover:scale-105 pixelated"
            >
              Continue Quest
            </button>
          </div>
        )}
      </div>
    );
  };

  // Achievements Screen Component (simplified for space)
  const AchievementsScreen = () => {
    const unlockedCount = userData.achievements.length;
    const totalCount = achievementsList.length;
    const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-yellow-600 to-amber-600 border-4 border-yellow-500 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-4 pixelated">🏆 HALL OF GLORY</h2>
          <div className="flex justify-around mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900 pixelated">{unlockedCount}</p>
              <p className="text-sm text-slate-800 pixelated">UNLOCKED</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900 pixelated">{totalCount}</p>
              <p className="text-sm text-slate-800 pixelated">TOTAL</p>
            </div>
          </div>
          <div className="w-full bg-yellow-800 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-yellow-300 to-amber-300 h-3 rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Profile Screen Component (simplified for space)
  const ProfileScreen = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-yellow-600 to-amber-600 border-4 border-yellow-500 rounded-lg p-6">
        <div className="flex flex-col items-center text-center">
          <CharacterAvatar level={stats.knightLevel} size="large" />
          <h2 className="text-2xl font-bold text-slate-900 mt-4 pixelated">{userData.heroName}</h2>
          <p className="text-slate-800 pixelated">Level {stats.knightLevel} {userData.avatarClass}</p>
          <p className="text-lg font-bold text-slate-900 mt-2 pixelated">{stats.daysSmokeFree} Days Strong!</p>
        </div>
      </div>
    </div>
  );

  // Main Game Screen
  const GameScreen = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Particle Effects */}
      <ParticleEffect />
      
      {/* Level Up Animation */}
      <LevelUpAnimation />
      
      {/* Header */}
      <div className="bg-slate-900 border-b-4 border-slate-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-transparent to-purple-900 opacity-30"></div>
        <div className="max-w-4xl mx-auto p-4 relative z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-yellow-500 pixelated">🏰 QUIT QUEST</h1>
            <div className="flex items-center gap-3">
              <CharacterAvatar level={stats.knightLevel} size="small" />
              <div className="text-right">
                <p className="text-yellow-500 font-bold pixelated">{userData.heroName}</p>
                <p className="text-gray-400 text-xs pixelated">Day {stats.daysSmokeFree}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800 border-b-4 border-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-5">
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className={`py-3 text-center transition-all pixelated ${
                currentScreen === 'dashboard' 
                  ? 'bg-gradient-to-b from-slate-700 to-slate-800 text-yellow-500 border-b-4 border-yellow-500' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Shield className="w-6 h-6 mx-auto mb-1" />
              <span className="text-xs font-bold">QUEST</span>
            </button>
            <button
              onClick={() => setCurrentScreen('story')}
              className={`py-3 text-center transition-all relative pixelated ${
                currentScreen === 'story' 
                  ? 'bg-gradient-to-b from-slate-700 to-slate-800 text-yellow-500 border-b-4 border-yellow-500' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-6 h-6 mx-auto mb-1" />
              <span className="text-xs font-bold">STORY</span>
              {!todayStoryViewed && userData.storyProgress.includes(stats.daysSmokeFree) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setCurrentScreen('battle')}
              className={`py-3 text-center transition-all relative pixelated ${
                currentScreen === 'battle' 
                  ? 'bg-gradient-to-b from-slate-700 to-slate-800 text-yellow-500 border-b-4 border-yellow-500' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Swords className="w-6 h-6 mx-auto mb-1" />
              <span className="text-xs font-bold">BATTLE</span>
              {battleState.inBattle && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setCurrentScreen('achievements')}
              className={`py-3 text-center transition-all pixelated ${
                currentScreen === 'achievements' 
                  ? 'bg-gradient-to-b from-slate-700 to-slate-800 text-yellow-500 border-b-4 border-yellow-500' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Trophy className="w-6 h-6 mx-auto mb-1" />
              <span className="text-xs font-bold">GLORY</span>
            </button>
            <button
              onClick={() => setCurrentScreen('profile')}
              className={`py-3 text-center transition-all pixelated ${
                currentScreen === 'profile' 
                  ? 'bg-gradient-to-b from-slate-700 to-slate-800 text-yellow-500 border-b-4 border-yellow-500' 
                  : 'text-gray-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <User className="w-6 h-6 mx-auto mb-1" />
              <span className="text-xs font-bold">HERO</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {currentScreen === 'dashboard' && <DashboardScreen />}
        {currentScreen === 'story' && <StoryScreen />}
        {currentScreen === 'battle' && <BattleScreen />}
        {currentScreen === 'achievements' && <AchievementsScreen />}
        {currentScreen === 'profile' && <ProfileScreen />}
      </div>
    </div>
  );

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        .pixelated {
          font-family: 'Press Start 2P', 'Courier New', monospace;
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes scale-up {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 5s infinite;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-scale-up {
          animation: scale-up 0.5s ease-out;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        .player-attack {
          animation: attack-right 0.5s ease-out;
        }
        
        .enemy-attack {
          animation: attack-left 0.5s ease-out;
        }
        
        .heal {
          animation: heal-glow 1s ease-out;
        }
        
        @keyframes attack-right {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(20px); }
        }
        
        @keyframes attack-left {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-20px); }
        }
        
        @keyframes heal-glow {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.5) hue-rotate(120deg); }
          100% { filter: brightness(1); }
        }
      `}</style>
      {gameState === 'setup' ? <SetupScreen /> : <GameScreen />}
    </>
  );
};

export default QuitQuestRPG;