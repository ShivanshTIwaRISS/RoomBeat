import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CreateRoomScreen } from '../screens/CreateRoomScreen';
import { JoinRoomScreen } from '../screens/JoinRoomScreen';
import { RoomDashboardScreen } from '../screens/RoomDashboardScreen';
import { MusicLibraryScreen } from '../screens/MusicLibraryScreen';
import { UploadMusicScreen } from '../screens/UploadMusicScreen';
import { QueueScreen } from '../screens/QueueScreen';
import { SyncDashboardScreen } from '../screens/SyncDashboardScreen';
import { DeviceCalibrationScreen } from '../screens/DeviceCalibrationScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
const Stack = createNativeStackNavigator();
const appTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.surfaceBorder,
        notification: colors.primary,
    },
};
export const AppNavigator = () => {
    return (<NavigationContainer theme={appTheme}>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="Splash" component={SplashScreen}/>
        <Stack.Screen name="Onboarding" component={OnboardingScreen}/>
        <Stack.Screen name="Home" component={HomeScreen}/>
        <Stack.Screen name="CreateRoom" component={CreateRoomScreen}/>
        <Stack.Screen name="JoinRoom" component={JoinRoomScreen}/>
        <Stack.Screen name="RoomDashboard" component={RoomDashboardScreen}/>
        <Stack.Screen name="MusicLibrary" component={MusicLibraryScreen}/>
        <Stack.Screen name="UploadMusic" component={UploadMusicScreen}/>
        <Stack.Screen name="Queue" component={QueueScreen}/>
        <Stack.Screen name="SyncDashboard" component={SyncDashboardScreen}/>
        <Stack.Screen name="DeviceCalibration" component={DeviceCalibrationScreen}/>
        <Stack.Screen name="Settings" component={SettingsScreen}/>
        <Stack.Screen name="Profile" component={ProfileScreen}/>
      </Stack.Navigator>
    </NavigationContainer>);
};
