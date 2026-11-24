import React from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from './src/navigation/AppNavigator';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 5000,
        },
    },
});

// Global error boundary to prevent white-screen crashes
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <View style={ebStyles.container}>
                    <Text style={ebStyles.title}>RoomBeat</Text>
                    <Text style={ebStyles.subtitle}>Something went wrong</Text>
                    <Text style={ebStyles.detail}>{String(this.state.error?.message || '')}</Text>
                    <Text
                        style={ebStyles.retry}
                        onPress={() => this.setState({ hasError: false, error: null })}
                    >
                        Tap to Retry
                    </Text>
                </View>
            );
        }
        return this.props.children;
    }
}

const ebStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0C10', justifyContent: 'center', alignItems: 'center', padding: 32 },
    title: { fontSize: 28, fontWeight: '700', color: '#10B981', marginBottom: 8 },
    subtitle: { fontSize: 18, fontWeight: '600', color: '#E0E7EE', marginBottom: 16 },
    detail: { fontSize: 13, color: '#8A94A6', textAlign: 'center', marginBottom: 24 },
    retry: { fontSize: 16, fontWeight: '700', color: '#10B981', paddingVertical: 12, paddingHorizontal: 32, borderWidth: 1, borderColor: '#10B981', borderRadius: 8 },
});

function App() {
    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <StatusBar barStyle="light-content" />
                    <AppNavigator />
                </QueryClientProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}
export default App;
