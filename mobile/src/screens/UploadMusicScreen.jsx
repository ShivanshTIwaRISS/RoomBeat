import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { colors, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ProgressBar } from '../components/common/ProgressBar';
import { tracksApi } from '../api/tracks';
import { formatFileSize } from '../utils/formatters';
export const UploadMusicScreen = ({ navigation, route, }) => {
    const { roomId } = route.params;
    const [selectedFile, setSelectedFile] = useState(null);
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const handlePickFile = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.audio],
            });
            // Max file size 50MB
            if (res.size && res.size > 52428800) {
                Alert.alert('File Too Large', 'Please select an audio file under 50 MB.');
                return;
            }
            setSelectedFile(res);
            const nameWithoutExt = res.name?.replace(/\.[^/.]+$/, '') || 'My Track';
            setTitle(nameWithoutExt);
        }
        catch (err) {
            if (!DocumentPicker.isCancel(err)) {
                console.warn('Document picker error:', err);
            }
        }
    };
    const handleUpload = async () => {
        if (!selectedFile) {
            Alert.alert('File Required', 'Please select an audio file to upload.');
            return;
        }
        try {
            setUploading(true);
            setProgress(0.2);
            const formData = new FormData();
            formData.append('file', {
                uri: Platform.OS === 'android' ? selectedFile.uri : selectedFile.uri.replace('file://', ''),
                type: selectedFile.type || 'audio/mpeg',
                name: selectedFile.name || 'track.mp3',
            });
            formData.append('title', title.trim() || selectedFile.name || 'Untitled');
            formData.append('artist', artist.trim() || 'Unknown Artist');
            setProgress(0.6);
            await tracksApi.upload(roomId, formData);
            setProgress(1.0);
            Alert.alert('Success', 'Track uploaded successfully to room!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        }
        catch (err) {
            Alert.alert('Upload Error', err.message || 'Failed to upload audio file.');
        }
        finally {
            setUploading(false);
        }
    };
    return (<View style={styles.container}>
      <Header title="Upload Music" onBack={() => navigation.goBack()}/>

      <ScrollView contentContainerStyle={styles.content}>
        {/* File Selection Card */}
        <Card style={styles.pickerCard}>
          <Text style={styles.pickerIcon}>AUDIO FILE</Text>
          <Text style={styles.pickerTitle}>
            {selectedFile ? selectedFile.name : 'Choose Audio File'}
          </Text>
          <Text style={styles.pickerSubtitle}>
            {selectedFile
            ? `${formatFileSize(selectedFile.size)} • ${selectedFile.type || 'Audio'}`
            : 'Supports MP3, WAV, M4A up to 50MB'}
          </Text>

          <Button title={selectedFile ? 'Change File' : 'Browse Files'} variant="secondary" size="sm" onPress={handlePickFile} style={styles.browseBtn}/>
        </Card>

        {selectedFile && (<View style={styles.formSection}>
            <Input label="Track Title" value={title} onChangeText={setTitle} placeholder="e.g. Bohemian Rhapsody"/>

            <Input label="Artist / Uploader" value={artist} onChangeText={setArtist} placeholder="e.g. Queen"/>

            {uploading && (<View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>Uploading and calculating SHA-256...</Text>
                <ProgressBar progress={progress} height={6}/>
              </View>)}

            <Button title="Upload Track to Room" onPress={handleUpload} size="lg" loading={uploading} style={styles.uploadBtn}/>
          </View>)}
      </ScrollView>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
    },
    pickerCard: {
        alignItems: 'center',
        padding: spacing.xl,
        marginBottom: spacing.lg,
        borderStyle: 'dashed',
    },
    pickerIcon: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 6,
        opacity: 0.8,
    },
    pickerTitle: {
        ...typography.h3,
        textAlign: 'center',
        marginBottom: 4,
    },
    pickerSubtitle: {
        ...typography.caption,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    browseBtn: {
        minWidth: 140,
    },
    formSection: {
        gap: spacing.xs,
    },
    progressContainer: {
        marginVertical: spacing.md,
    },
    progressLabel: {
        ...typography.caption,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    uploadBtn: {
        marginTop: spacing.md,
    },
});
