import json

with open(r'C:\Users\hjk34\.gemini\antigravity\brain\ac01be74-269e-4415-880f-2deedbf46146\.system_generated\logs\transcript.jsonl', encoding='utf-8') as f:
    with open(r'C:\Antigravity\WSA_Backoffice\scratch\logs_out.txt', 'w', encoding='utf-8') as f_out:
        for line in f:
            if '"type":"USER_INPUT"' in line:
                data = json.loads(line)
                f_out.write(f"STEP: {data.get('step_index')}\n")
                f_out.write(data.get('content') + "\n")
                f_out.write("-" * 40 + "\n")
