/* Harness offline de regresion construirHoy (node harness-construirHoy.js) */
function num(x){ var n=Number(x); return isFinite(n)?n:null; }
function normEstado(e){ var s=String(e||"").toUpperCase(); if(s.indexOf("FACTURA")>=0)return "Factura"; if(s.indexOf("CONFIRMA")>=0)return "Confirmación"; return "Ninguno"; }
function pad9(v){ return String(v||"").replace(/\D/g,"").padStart(9,"0"); }
function alias(row,keys){ for(var i=0;i<keys.length;i++){ var k=keys[i]; if(row[k]!=null&&row[k]!=="")return row[k]; } return null; }
var ALIAS_DIARIO={ov:["ov"],cliente:["cliente"],peso:["peso"],cantidad:["cantidad"],estado:["estado"]};
function buildLineas(filas){
  var lineas=[], lineId=0, _suma=0, i, f, p;
  for(i=0;i<filas.length;i++){ p=num(alias(filas[i],ALIAS_DIARIO.peso)); if(p!=null)_suma+=p; }
  var _flip=_suma<0?-1:1, _devol=0;
  for(i=0;i<filas.length;i++){
    f=filas[i];
    var ov=String(alias(f,ALIAS_DIARIO.ov)||"").trim(); if(!ov)continue;
    var id=pad9(alias(f,ALIAS_DIARIO.cliente)); if(!id)continue;
    var peso=num(alias(f,ALIAS_DIARIO.peso)); if(peso==null)peso=0; peso=peso*_flip;
    var cantidad=num(alias(f,ALIAS_DIARIO.cantidad)); if(cantidad!=null)cantidad=cantidad*_flip;
    var qty=(cantidad!=null&&cantidad!==0)?cantidad:(peso<0?-1:1);
    var devolucion=(peso<0||qty<0); if(devolucion)_devol++;
    lineas.push({ov:ov,idCliente:id,peso:peso,cantidad:qty,devolucion:devolucion,estado:normEstado(alias(f,ALIAS_DIARIO.estado)),despachado:devolucion===true});
  }
  return {lineas:lineas,_devol:_devol};
}
function assert(c,m){ if(!c) throw new Error(m); }
var r=buildLineas([{ov:"1",cliente:"1",peso:-10,cantidad:-2,estado:"Factura"},{ov:"1",cliente:"1",peso:-5,cantidad:-1,estado:"Factura"}]);
assert(r.lineas.every(function(l){return l.peso>0;})&&r._devol===0,"T1 all-neg");
r=buildLineas([{ov:"1",cliente:"1",peso:-100,cantidad:-10,estado:"F"},{ov:"1",cliente:"1",peso:20,cantidad:2,estado:"F"}]);
assert(r._devol===1&&r.lineas[0].peso===100&&r.lineas[1].peso===-20,"T2 devolucion");
assert(r.lineas[1].despachado===true,"T4 despachado devolucion");
console.log("HARNESS_OK");
