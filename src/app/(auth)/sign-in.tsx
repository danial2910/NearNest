import { useSignIn } from '@clerk/expo'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const isLoading = fetchStatus === 'fetching'

  const handleSignIn = async () => {
    setErrorMessage('')

    const { error } = await signIn.password({ identifier: email, password })
    if (error) {
      setErrorMessage(error.longMessage ?? error.message ?? 'Unable to sign in.')
      alert(error.message)
      return
    }

    const { error: finalizeError } = await signIn.finalize()
    if (finalizeError) {
      setErrorMessage(finalizeError.longMessage ?? finalizeError.message ?? 'Unable to sign in.')
      return
    }

    router.replace('/(root)/(tabs)')
  }

  return (
    <ScrollView
      contentContainerClassName="grow bg-white justify-center px-6 py-12"
      keyboardShouldPersistTaps="handled"
    >
      <Image
        source={require('../../../assets/images/logo.png')}
        className="w-40 h-40 mb-8"
        resizeMode="contain"
      />

      <Text className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</Text>
      <Text className="text-gray-500 mb-8">Sign in to continue your search.</Text>

      <TextInput
        className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Email Address"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TextInput
        className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        autoComplete="current-password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {errorMessage ? <Text className="text-red-600 mb-4">{errorMessage}</Text> : null}

      <TouchableOpacity
        onPress={handleSignIn}
        disabled={isLoading}
        className="w-full bg-primary rounded-xl py-4 items-center active:opacity-80 disabled:opacity-50"
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-base">Sign In</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center mt-6">
        <Text className="text-gray-500">Don&apos;t have an account? </Text>
        <Link href="/sign-up" className="text-primary font-bold">
          Sign up
        </Link>
      </View>
    </ScrollView>
  )
}
