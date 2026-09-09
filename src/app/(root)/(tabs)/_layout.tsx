import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router';
import { useUserStore } from '../../../../store/userStore';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function IOSTabLayout() {
  const isAdmin = useUserStore((state) => state.isAdmin);
  
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {isAdmin && (
        <NativeTabs.Trigger name="create">
          <NativeTabs.Trigger.Icon sf="plus.circle.fill"/>
          <NativeTabs.Trigger.Label>Add Property</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon sf="heart.fill"/>
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.fill"/>
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function AndroidTabsLayout() {
  const isAdmin = useUserStore((state) => state.isAdmin);
  
  return (
    <Tabs screenOptions={{headerShown: false}}>
      <Tabs.Screen name="index" options={{
        title: "Home", 
        tabBarIcon: ({color,size}) => (
          <Ionicons name="home" color={color} size={size} />
        ),
      }} 
      />

      <Tabs.Screen name="search" options={{
        title: "Search", 
        tabBarIcon: ({color,size}) => (
          <Ionicons name="search" color={color} size={size} />
        ),
      }} 
      />

      <Tabs.Screen name="create" options={{
        title: "Add",
        href : isAdmin ? undefined : null, 
        tabBarIcon: ({color,size}) => (
          <Ionicons name="add-circle" color={color} size={size} />
        ),
      }} 
      />

      <Tabs.Screen name="saved" options={{
        title: "Saved",
        tabBarIcon: ({color,size}) => (
          <Ionicons name="heart" color={color} size={size} />
        ),
      }} 
      />

      <Tabs.Screen name="profile" options={{
        title: "Profile",
        tabBarIcon: ({color,size}) => (
          <Ionicons name="person" color={color} size={size} />
        ),
      }} 
      />      

    </Tabs>
    
    
  );
}

export default function TabLayout() {
  return Platform.OS === 'ios' ? <IOSTabLayout /> : <AndroidTabsLayout />;
}
