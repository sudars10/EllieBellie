import { Link, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/details/[id]',
              params: { id: 'bacon' }
            });
          }}
          style={styles.iconButton}
        >
          <FontAwesome name="user" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.buttonText}>User 1</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/details/[id]',
              params: { id: 'sausage' }
            });
          }}
          style={styles.iconButton}
        >
          <FontAwesome name="user" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.buttonText}>User 2</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  iconButton: {
    padding: 15,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    marginTop: 8,
    fontSize: 16,
    color: '#333',
  },
});