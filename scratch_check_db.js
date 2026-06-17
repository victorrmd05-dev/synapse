const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  console.log('--- workflow_copywriting ---');
  const { data: copyData, error: copyError } = await supabase.from('workflow_copywriting').select('*').limit(1);
  if (copyError) console.error(copyError);
  else if (copyData.length > 0) console.log(Object.keys(copyData[0]));
  else console.log('No data');

  console.log('--- workflow_design ---');
  const { data: designData, error: designError } = await supabase.from('workflow_design').select('*').limit(1);
  if (designError) console.error(designError);
  else if (designData.length > 0) console.log(Object.keys(designData[0]));
  else console.log('No data');
}
check();
