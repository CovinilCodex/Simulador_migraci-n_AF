"""Reproducible screening from Van Krevelen & te Nijenhuis (2009), Tables 7.3/7.10.
No vendor composition or measured HSP is assumed. Python standard library only.
"""
import csv, json, math, re
from pathlib import Path
OUT=Path(__file__).parent
# Fd, Fp, Eh (J/mol), Fedors V (cm3/mol), Fedors Ecoh (J/mol), atom count
G={
 'CH3':(420,0,0,33.5,4710,{'C':1,'H':3}),
 'CH2':(270,0,0,16.1,4940,{'C':1,'H':2}),
 'CH':(80,0,0,-1.0,3430,{'C':1,'H':1}),
 'alkene_CH':(200,0,0,13.5,4310,{'C':1,'H':1}),
 'OH':(210,500,20000,10.0,29800,{'O':1,'H':1}),
 'OH_adj':(210,500,20000,13.0,21850,{'O':1,'H':1}),
 'ether':(100,400,3000,3.8,3350,{'O':1}),
 'ester':(390,490,7000,18.0,18000,{'C':1,'O':2}),
 'ring5plus':(190,0,0,16.0,1050,{}),
}
items=[]
def add(name,commercial,formula,counts,priority,note):
 items.append(dict(name=name,commercial_reference=commercial,formula=formula,groups=counts,priority=priority,assumptions=note))
def glycerol(n,unsat=False):
 return dict(CH3=1,CH2=n,CH=1,OH_adj=2,ester=1,**({'alkene_CH':2} if unsat else {}))
for name,n,formula in [('Glyceryl monolaurate',12,'C15H30O4'),('Glyceryl monopalmitate',16,'C19H38O4'),('Glyceryl monostearate',18,'C21H42O4')]:
 add(name,{'Glyceryl monolaurate':'GML / monolaurin','Glyceryl monopalmitate':'GMP / monopalmitin','Glyceryl monostearate':'GMS / monostearin'}[name],formula,glycerol(n),'First screen','Pure primary (1-)monoester; two remaining OH on adjacent carbons. Commercial mono-/diglyceride mixtures are not this molecule.')
add('Glyceryl monooleate','GMO / monoolein','C21H40O4',glycerol(16,True),'First screen','Pure primary monoester of cis-oleic acid; not a mixed oleate grade.')
add('Propylene glycol monostearate','PGMS','C21H42O3',dict(CH3=2,CH2=17,CH=1,OH=1,ester=1),'First screen','Primary monoester, one free OH; commercial isomers/diesters not included.')
add('Diglyceryl monostearate','Polyglyceryl-2 stearate family','C24H48O6',dict(CH3=1,CH2=20,CH=2,OH_adj=2,OH=1,ether=1,ester=1),'Second screen','One linear primary monoester of alpha,alpha-prime diglycerol; two adjacent OH and one isolated OH. Grade oligomer/isomer distribution must be supplied.')
for suffix,n,formula,ref,unsat in [('laurate',12,'C18H34O6','Span 20',False),('palmitate',16,'C22H42O6','Span 40',False),('stearate',18,'C24H46O6','Span 60',False),('oleate',16,'C24H44O6','Span 80',True)]:
 counts=dict(CH3=1,CH2=n,CH=4,OH_adj=2,OH=1,ether=1,ester=1,ring5plus=1)
 if unsat:counts['alkene_CH']=2
 add('Sorbitan mono'+suffix,ref+'-type family',formula,counts,'First screen' if suffix in ['stearate','oleate'] else 'Second screen','Ideal 1,4-sorbitan 6-monoester: one ring ether; free OH at C2/C3/C5. Commercial sorbitan esters contain isomers and other esterification levels.')
for n,formula in [(2,'C22H44O4'),(8,'C34H68O10')]:
 add(f'PEG-{n} monostearate',f'PEG-{n} stearate family',formula,dict(CH3=1,CH2=16+2*n,OH=1,ether=n-1,ester=1),'Second screen',f'Pure monoester with exactly {n} oxyethylene units; one free terminal OH. Commercial PEG distributions and diesters excluded.')
for tail,n,formula in [(12,2,'C16H34O3'),(12,4,'C20H42O5'),(12,7,'C26H54O8'),(18,2,'C22H46O3')]:
 name=('Laureth' if tail==12 else 'Steareth')+f'-{n}'
 add(name,name+' family',formula,dict(CH3=1,CH2=tail-1+2*n,OH=1,ether=n),'Exploratory comparison',f'Linear pure C{tail} alcohol ethoxylate with exactly {n} EO units; one terminal OH, not a commercial homolog distribution.')
for suffix,n,formula,ref,unsat in [('laurate',52,'C58H114O26','Polysorbate 20 / Tween 20',False),('stearate',58,'C64H126O26','Polysorbate 60 / Tween 60',False),('oleate',56,'C64H124O26','Polysorbate 80 / Tween 80',True)]:
 counts=dict(CH3=1,CH2=n,CH=4,OH=3,ether=21,ester=1,ring5plus=1)
 if unsat:counts['alkene_CH']=2
 add('Sorbitan mono'+suffix+' + 20 EO',ref+'-type family',formula,counts,'Exploratory comparison','Ideal single-ring monoester with exactly 20 added EO units across all three free OH arms; three isolated terminal OH remain. Not an exact commercial polysorbate composition.')
rows=[]
for item in items:
 counts=item['groups']; atoms={k:sum(n*G[g][5].get(k,0) for g,n in counts.items()) for k in ['C','H','O']}
 assert atoms=={k:int(v or 1) for k,v in re.findall(r'([CHO])(\d*)',item['formula'])},item['name']
 V=sum(n*G[g][3] for g,n in counts.items());Fd=sum(n*G[g][0] for g,n in counts.items());Fp2=sum(n*G[g][1]**2 for g,n in counts.items());Eh=sum(n*G[g][2] for g,n in counts.items());E=sum(n*G[g][4] for g,n in counts.items())
 d=Fd/V;p=math.sqrt(Fp2)/V;h=math.sqrt(Eh/V);total=math.sqrt(d*d+p*p+h*h)
 MW=sum(atoms[a]*w for a,w in [('C',12.011),('H',1.008),('O',15.999)])
 assert V>0 and all(math.isfinite(v) for v in [d,p,h,total])
 rows.append({**item,'V_Fedors_cm3_mol':V,'molecular_weight_g_mol':MW,'implied_density_g_cm3':MW/V,'sum_Fd':Fd,'sum_Fp_squared':Fp2,'sum_Eh_J_mol':Eh,'delta_D':d,'delta_P':p,'delta_H':h,'delta_total_HVK':total,'delta_total_Fedors':math.sqrt(E/V),'symmetry_factor_P':1,'status':'estimated ideal molecule; commercial grade not verified'})
(OUT/'screening.json').write_text(json.dumps({'source':'Van Krevelen & te Nijenhuis, Properties of Polymers, 4th ed., 2009; chapter 7; Table 7.3 p195/PDF222; Table 7.10 p215/PDF242; Eqs7.22-7.24 pp213-214/PDF240-241','group_constants':G,'method':'HVK components using Fedors estimated molar volume; Fedors total as separate cross-check; no symmetry reduction','rows':rows},indent=2))
with (OUT/'screening.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader()
 for r in rows:w.writerow({k:json.dumps(v) if isinstance(v,dict) else round(v,6) if isinstance(v,float) else v for k,v in r.items()})
table='| Representative molecule | Commercial family / common name | δD | δP | δH | δ total (HVK) | δ total (Fedors) |\n|---|---|---:|---:|---:|---:|---:|\n'
for r in rows:table+='| '+r['name']+' | '+r['commercial_reference']+' | '+' | '.join(f'{r[k]:.1f}' for k in ['delta_D','delta_P','delta_H','delta_total_HVK','delta_total_Fedors'])+' |\n'
(OUT/'table.md').write_text(table)
print(table)
print('Validated molecular formulas for',len(rows),'representative structures.')
