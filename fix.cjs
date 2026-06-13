const fs = require('fs');

let content = fs.readFileSync('src/components/DynamicAdminSettings.tsx', 'utf8');

content = content.replace(/import \{.*?\} from '\.\.\/firebase';\n/gs, '');
content = content.replace(/import \{.*?\} from 'firebase\/app';\n/gs, '');
content = content.replace(/import \{.*?\} from 'firebase\/auth';\n/gs, '');

content = content.replace(/getSecondaryAuth\(\)/g, "({} as any)");
content = content.replace(/writeBatch\(db\)/g, "({ set: () => {}, update: () => {}, commit: async () => {} } as any)");
content = content.replace(/console\.error\("Add Church Bank error:", e\);/g, "");
content = content.replace(/handleFirestoreError\(.*?\);/g, "console.error('Operation disabled');");
content = content.replace(/await addDoc\(collection\(db, .*?\), .*?\);/g, "alert('Operation disabled');");
content = content.replace(/await setDoc\(doc\(db, .*?\), .*?\);/g, "alert('Operation disabled');");
content = content.replace(/await setDoc\(doc\(db, .*?\), .*?, \{ merge: true \}\);/g, "alert('Operation disabled');");
content = content.replace(/await deleteDoc\(doc\(db, .*?\)\);/g, "alert('Operation disabled');");
content = content.replace(/await getDocs\(collection\(db, .*?\)\);/g, "({ docs: [] } as any);");
content = content.replace(/await getDoc\(doc\(db, .*?\)\);/g, "({ exists: () => false, data: () => ({}) } as any);");
content = content.replace(/doc\(collection\(db, .*?\)\)/g, "({} as any)");
content = content.replace(/doc\(db, .*?\)/g, "({} as any)");
content = content.replace(/collection\(db, .*?\)/g, "({} as any)");
content = content.replace(/query\(.*?\)/g, "({} as any)");
content = content.replace(/where\(.*?\)/g, "({} as any)");
content = content.replace(/await signOut\(.*?\);/g, "");
content = content.replace(/await createUserWithEmailAndPassword\(.*?\);/g, "({ user: { uid: 'dummy' } } as any);");


const replaceTryCatch = `const fetchDynamicData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: churchesData },
          { data: levelsData },
          { data: compData },
          { data: activityData },
          { data: hymnData },
          { data: configData },
          { data: validationData }
        ] = await Promise.all([
          supabase.from('churches').select('*').range(0, 4999),
          supabase.from('levels').select('*').range(0, 4999),
          supabase.from('competitions').select('*').range(0, 4999),
          supabase.from('activityStages').select('*').range(0, 4999),
          supabase.from('hymnStages').select('*').range(0, 4999),
          supabase.from('system_settings').select('*').eq('id', 'app_config').maybeSingle(),
          supabase.from('system_settings').select('*').eq('id', 'validation').maybeSingle()
        ]);

        if (!isMounted) return;

        if (churchesData) setChurches(churchesData);
        if (levelsData) setLevels(levelsData.sort((a: any, b: any) => sortStages(a.name, b.name)));
        if (compData) setCompetitions(compData);
        if (activityData) setActivityStages(activityData);
        if (hymnData) setHymnStages(hymnData);
        
        if (configData) {
          setAppLogo(configData.appLogo || null);
          setGlobalReadAccess(configData.global_read_access !== false);
        }
        
        if (validationData) {
          setValidationSettings({
            templates: validationData.templates || [],
            ageMappings: validationData.ageMappings || [],
            rules: validationData.rules || { nameLength: true, genderMatch: false, mandatoryRows: true }
          });
        }
      } catch (err) {
        console.error("Error fetching dynamic admin settings from Supabase:", err);
      } finally {
        setIsLoading(false);
        if (isMounted) setIsLoading(false);
      }
    };`;

content = content.replace(/const fetchDynamicData = async \(\) => \{[\s\S]*?if \(isMounted\) setIsLoading\(false\);\n      \}\n    \};/m, replaceTryCatch);

fs.writeFileSync('src/components/DynamicAdminSettings.tsx', content);
