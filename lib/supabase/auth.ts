import { createClient } from './server'

export async function getSession() {
  const supabase = await createClient()
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Error fetching session:', error)
    return null
  }
}

export async function getUser() {
  const supabase = await createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function getUserProfile() {
  const supabase = await createClient()
  const user = await getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, countries(*), languages(*)')
    .eq('id', user.id)
    .single()

  return profile
}
