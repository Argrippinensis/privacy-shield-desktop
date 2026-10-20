# Modell-Spike (Vorabmessung): PII-Modell mit onnxruntime auf den Testsaetzen des Harness laufen lassen.
# Vorbereitung: pip install --target /tmp/ps-hf/lib onnxruntime tokenizers numpy; Modell nach /tmp/ps-hf/bardsai-v2 laden;
# cases.json aus tests/eval/cases.mjs, cases-gdpr.mjs und generate.mjs erzeugen (siehe 10-modell-spike.md).
import sys, json, time
sys.path.insert(0,'/tmp/ps-hf/lib')
import numpy as np, onnxruntime as ort
from tokenizers import Tokenizer
M='/tmp/ps-hf/bardsai-v2'
cfg=json.load(open(M+'/config.json')); id2label={int(k):v for k,v in cfg['id2label'].items()}
tok=Tokenizer.from_file(M+'/tokenizer.json')
so=ort.SessionOptions(); so.intra_op_num_threads=4
sess=ort.InferenceSession(M+'/onnx/model_quantized.onnx', so, providers=['CPUExecutionProvider'])
names=[i.name for i in sess.get_inputs()]
def spans(text, minscore=0.0):
    enc=tok.encode(text, add_special_tokens=True)
    ids=np.array([enc.ids],dtype=np.int64); att=np.array([enc.attention_mask],dtype=np.int64)
    feed={'input_ids':ids,'attention_mask':att}
    feed={k:v for k,v in feed.items() if k in names}
    lg=sess.run(None,feed)[0][0]
    pred=lg.argmax(-1)
    out=[]; cur=None
    for i,(p,(s,e)) in enumerate(zip(pred,enc.offsets)):
        lab=id2label[int(p)]
        if lab=='O' or (s==0 and e==0):
            if cur: out.append(cur); cur=None
            continue
        typ=lab.split('-',1)[-1]; begin=lab.startswith('B-')
        if cur and cur['type']==typ and not begin and s<=cur['end']+1:
            cur['end']=e
        else:
            if cur: out.append(cur)
            cur={'type':typ,'start':s,'end':e}
    if cur: out.append(cur)
    return out
def mask(text, sp):
    res=text
    for s in sorted(sp,key=lambda x:-x['start']):
        res=res[:s['start']]+'{{'+s['type']+'}}'+res[s['end']:]
    return res
data=json.load(open('/tmp/ps-hf/cases.json'))
tot_t=0; tot_c=0
res={}
for group in ('curated','gdpr','synth'):
    leaks=0; pos=0; fp=0; neg=0; details=[]
    for c in data[group]:
        t0=time.time(); sp=spans(c['text']); dt=time.time()-t0; tot_t+=dt; tot_c+=len(c['text'])
        out=mask(c['text'],sp)
        if group=='synth':
            for t in c['truth']:
                pos+=1
                if any(f in out for f in t['frags']): leaks+=1; details.append((c['id'],t['type'],[f for f in t['frags'] if f in out]))
        elif c['cat']=='NEG':
            neg+=1
            if '{{' in out: fp+=1; details.append((c['id'],'FP',out[:60]))
        else:
            pos+=1
            l=[f for f in c['frags'] if f in out]
            if l: leaks+=1; details.append((c['id'],c['cat'],l))
    res[group]={'pos':pos,'leaks':leaks,'neg':neg,'fp':fp,'details':details}
    print(f"{group:8} Werte/Faelle undicht: {leaks}/{pos} | Negativfaelle falsch maskiert: {fp}/{neg}")
print(f"Zeit: {tot_t:.1f} s fuer {tot_c} Zeichen = {1000*tot_t/tot_c*1000:.0f} ms je 1000 Zeichen (CPU, 4 Threads, Python onnxruntime)")
json.dump(res,open('/tmp/ps-hf/result-bardsai.json','w'),ensure_ascii=False,indent=1)
print('\nLecks GDPR-Probe:'); 
for d in res['gdpr']['details']: print('  ',d)
print('\nLecks kuratiert:');
for d in res['curated']['details']: print('  ',d)
