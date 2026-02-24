import json
import re

with open('../work/embedded_script_with_newlines.js', 'r') as f:
    content = f.read()

# Extract jobTranslations
job_trans_match = re.search(r'const jobTranslations = (\{.*?\});', content, re.DOTALL)
job_trans = {}
if job_trans_match:
    lines = job_trans_match.group(1).split('\n')
    for line in lines:
        if ':' in line:
            parts = line.split(':')
            key = parts[0].strip().strip('"').strip("'")
            val = parts[1].split(',')[0].strip().strip('"').strip("'")
            job_trans[key] = val

# Extract skillTranslations
skill_trans_match = re.search(r'const skillTranslations = (\{.*?\});', content, re.DOTALL)
skill_trans = {}
if skill_trans_match:
    lines = skill_trans_match.group(1).split('\n')
    for line in lines:
        if ':' in line:
            parts = line.split(':')
            key = parts[0].strip().strip('"').strip("'")
            val = parts[1].split(',')[0].strip().strip('"').strip("'")
            skill_trans[key] = val

# Extract weaponTranslations
weapon_trans_match = re.search(r'const weaponTranslations = (\{.*?\});', content, re.DOTALL)
weapon_trans = {}
if weapon_trans_match:
    lines = weapon_trans_match.group(1).split('\n')
    for line in lines:
        if ':' in line:
            parts = line.split(':')
            key = parts[0].strip().strip('"').strip("'")
            val = parts[1].split(',')[0].strip().strip('"').strip("'")
            weapon_trans[key] = val

# Extract jobSkillProfiles
profiles_match = re.search(r'const jobSkillProfiles = (\{.*?\});\n\nfunction', content, re.DOTALL)
if profiles_match:
    profiles_str = profiles_match.group(1)
    
    # Translate keys
    for fr, en in job_trans.items():
        profiles_str = re.sub(rf'"{fr}":', f'"{en}":', profiles_str)
        profiles_str = re.sub(rf'\b{fr}:', f'"{en}":', profiles_str)
    for fr, en in skill_trans.items():
        profiles_str = re.sub(rf'"{fr}":', f'"{en}":', profiles_str)
        profiles_str = re.sub(rf'\b{fr}:', f'"{en}":', profiles_str)
    for fr, en in weapon_trans.items():
        profiles_str = profiles_str.replace(f'"{fr}"', f'"{en}"')
        
    # Write to data.ts
    with open('src/data.ts', 'r') as f:
        data_content = f.read()
    
    # Remove the previously appended jobSkillProfiles
    data_content = re.sub(r'\nexport const jobSkillProfiles: Record<string, any> = \{.*?\};\n', '', data_content, flags=re.DOTALL)
    
    with open('src/data.ts', 'w') as out:
        out.write(data_content)
        out.write('\nexport const jobSkillProfiles: Record<string, any> = ' + profiles_str + ';\n')
