// Test script for the achievement system
const { initDatabase } = require('./dist/utils/pointsManager.js');
const { 
  checkAndUnlockAchievements, 
  getUserAchievementProgress,
  ACHIEVEMENTS 
} = require('./dist/utils/achievementUtils.js');

async function testAchievements() {
  console.log('🧪 Testing Achievement System...\n');
  
  // Initialize database
  initDatabase();
  
  // Wait a moment for database initialization
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('📋 Available Achievements:');
  ACHIEVEMENTS.forEach(achievement => {
    console.log(`${achievement.emoji} ${achievement.name} (${achievement.category}) - ${achievement.description}`);
  });
  
  console.log('\n🔍 Testing achievement checking for test user...');
  
  // Test checking achievements for a fake user
  const testUserId = 'test_user_123';
  const testUsername = 'TestUser';
  
  try {
    const newAchievements = await checkAndUnlockAchievements(testUserId, testUsername);
    console.log(`✅ Achievement check completed. Found ${newAchievements.length} new achievements.`);
    
    if (newAchievements.length > 0) {
      console.log('🏅 New achievements unlocked:');
      newAchievements.forEach(achievement => {
        console.log(`  ${achievement.emoji} ${achievement.name} - ${achievement.description}`);
      });
    }
    
    // Get progress
    const progress = await getUserAchievementProgress(testUserId);
    console.log(`\n📊 Progress: ${progress.totalUnlocked}/${progress.totalPossible} achievements unlocked`);
    
    console.log('\n✅ Achievement system test completed successfully!');
  } catch (error) {
    console.error('❌ Error during achievement test:', error);
  }
}

testAchievements().catch(console.error);
