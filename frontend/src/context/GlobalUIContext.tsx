import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomAlert, { CustomAlertButton } from '../components/ui/CustomAlert';
import SharkLoader from '../components/ui/SharkLoader';
import { Modal, View, StyleSheet } from 'react-native';

interface GlobalUIContextType {
  showAlert: (title: string, message?: string, buttons?: CustomAlertButton[], type?: 'success' | 'error' | 'warning' | 'info') => void;
  hideAlert: () => void;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

const GlobalUIContext = createContext<GlobalUIContextType | undefined>(undefined);

export function GlobalUIProvider({ children }: { children: ReactNode }) {
  // Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    buttons?: CustomAlertButton[];
    type?: 'success' | 'error' | 'warning' | 'info';
  }>({ title: '' });

  // Loader State
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState<string | undefined>(undefined);

  const showAlert = (title: string, message?: string, buttons?: CustomAlertButton[], type?: 'success' | 'error' | 'warning' | 'info') => {
    setAlertConfig({ title, message, buttons, type });
    setAlertVisible(true);
  };

  const hideAlert = () => setAlertVisible(false);

  const showLoader = (message?: string) => {
    setLoaderMessage(message);
    setLoaderVisible(true);
  };

  const hideLoader = () => setLoaderVisible(false);

  return (
    <GlobalUIContext.Provider value={{ showAlert, hideAlert, showLoader, hideLoader }}>
      {children}
      
      {/* Global Alert */}
      <CustomAlert 
        visible={alertVisible} 
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        type={alertConfig.type}
        onDismiss={hideAlert}
      />

      {/* Global Fullscreen Loader */}
      <Modal visible={loaderVisible} transparent animationType="fade" onRequestClose={hideLoader}>
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderBox}>
            <SharkLoader message={loaderMessage || 'Đang xử lý...'} size="large" />
          </View>
        </View>
      </Modal>

    </GlobalUIContext.Provider>
  );
}

export function useGlobalUI() {
  const context = useContext(GlobalUIContext);
  if (!context) {
    throw new Error('useGlobalUI must be used within a GlobalUIProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  }
});
