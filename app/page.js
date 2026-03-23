import { supabase } from '../lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('test_items').select('*')

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Meditation Lab</h1>
      <p>Supabase connection test</p>

      {error ? (
        <p style={{ color: 'red' }}>Error: {error.message}</p>
      ) : (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </main>
  )
}
