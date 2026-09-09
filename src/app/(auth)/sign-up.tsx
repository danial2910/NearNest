import { useSignUp } from '@clerk/expo'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp()
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')

  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isLoading = fetchStatus === 'fetching'

  const handleSignUp = async () => {
    setErrorMessage('')

    const { error } = await signUp.password({
      emailAddress: email,
      password,
      firstName,
      lastName,
    })
    if (error) {
      setErrorMessage(error.longMessage ?? error.message ?? 'Unable to create your account.')
      alert(error.message)
      return
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode()
    if (sendError) {
      setErrorMessage(sendError.longMessage ?? sendError.message ?? 'Unable to send the verification code.')
      return
    }

    setIsVerifying(true)
  }

  const handleVerify = async () => {
    setErrorMessage('')

    const { error } = await signUp.verifications.verifyEmailCode({ code })
    if (error) {
      setErrorMessage(error.longMessage ?? error.message ?? 'That code was not accepted.')
      return
    }

    const { error: finalizeError } = await signUp.finalize()
    if (finalizeError) {
      setErrorMessage(finalizeError.longMessage ?? finalizeError.message ?? 'Unable to finish signing up.')
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

      {isVerifying ? (
        <>
          <Text className="text-3xl font-bold text-gray-800 mb-2">Check your email</Text>
          <Text className="text-gray-500 mb-8">
            We sent a verification code to {email}.
          </Text>

          <TextInput
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
            placeholder="Verification code"
            placeholderTextColor="#9CA3AF"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />

          {errorMessage ? <Text className="text-red-600 mb-4">{errorMessage}</Text> : null}

          <Pressable
            className="w-full bg-primary rounded-xl py-4 items-center active:opacity-80 disabled:opacity-50"
            onPress={handleVerify}
            disabled={isLoading}
          >
            <Text className="text-white font-bold text-base">
              {isLoading ? 'Verifying...' : 'Verify email'}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="text-3xl font-bold text-gray-800 mb-2">Create Account</Text>
          <Text className="text-gray-500 mb-8">Your Next Home, Nearby.</Text>

          <View className="flex-row gap-3 mb-4">
            <TextInput
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
              placeholder="First Name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
              placeholder="Last Name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

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
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {errorMessage ? <Text className="text-red-600 mb-4">{errorMessage}</Text> : null}

          <TouchableOpacity
            onPress={handleSignUp}
            className="w-full bg-primary rounded-xl py-4 items-center active:opacity-80 disabled:opacity-50"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">
                SignUp
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Already have an account? </Text>
            <Link href="/sign-in" className="text-primary font-bold">
              Sign in
            </Link>
          </View>

          {/* Required for sign-up on Expo web. Clerk skips the CAPTCHA on iOS and Android. */}
          <View nativeID="clerk-captcha" />
        </>
      )}
    </ScrollView>
  )
}
