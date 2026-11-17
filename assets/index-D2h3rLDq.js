(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function t(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(i){if(i.ep)return;i.ep=!0;const o=t(i);fetch(i.href,o)}})();var ne=function(){return ne=Object.assign||function(e){for(var n,t=1,s=arguments.length;t<s;t++)for(var i in n=arguments[t])Object.prototype.hasOwnProperty.call(n,i)&&(e[i]=n[i]);return e},ne.apply(this,arguments)};function Me(e,n,t){for(var s,i=0,o=n.length;i<o;i++)!s&&i in n||(s||(s=Array.prototype.slice.call(n,0,i)),s[i]=n[i]);return e.concat(s||Array.prototype.slice.call(n))}function we(e){return Array.prototype.slice.call(e)}function Ee(e,n){var t=Math.floor(e);return t===n||t+1===n?e:n}function Le(){return Date.now()}function be(e,n,t){if(n="data-keen-slider-"+n,t===null)return e.removeAttribute(n);e.setAttribute(n,t||"")}function ue(e,n){return n=n||document,typeof e=="function"&&(e=e(n)),Array.isArray(e)?e:typeof e=="string"?we(n.querySelectorAll(e)):e instanceof HTMLElement?[e]:e instanceof NodeList?we(e):[]}function oe(e){e.raw&&(e=e.raw),e.cancelable&&!e.defaultPrevented&&e.preventDefault()}function ae(e){e.raw&&(e=e.raw),e.stopPropagation&&e.stopPropagation()}function Ae(){var e=[];return{add:function(n,t,s,i){n.addListener?n.addListener(s):n.addEventListener(t,s,i),e.push([n,t,s,i])},input:function(n,t,s,i){this.add(n,t,(function(o){return function(a){a.nativeEvent&&(a=a.nativeEvent);var m=a.changedTouches||[],E=a.targetTouches||[],f=a.detail&&a.detail.x?a.detail:null;return o({id:f?f.identifier?f.identifier:"i":E[0]?E[0]?E[0].identifier:"e":"d",idChanged:f?f.identifier?f.identifier:"i":m[0]?m[0]?m[0].identifier:"e":"d",raw:a,x:f&&f.x?f.x:E[0]?E[0].screenX:f?f.x:a.pageX,y:f&&f.y?f.y:E[0]?E[0].screenY:f?f.y:a.pageY})}})(s),i)},purge:function(){e.forEach((function(n){n[0].removeListener?n[0].removeListener(n[2]):n[0].removeEventListener(n[1],n[2],n[3])})),e=[]}}}function ge(e,n,t){return Math.min(Math.max(e,n),t)}function j(e){return(e>0?1:0)-(e<0?1:0)||+e}function Te(e){var n=e.getBoundingClientRect();return{height:Ee(n.height,e.offsetHeight),width:Ee(n.width,e.offsetWidth)}}function z(e,n,t,s){var i=e&&e[n];return i==null?t:s&&typeof i=="function"?i():i}function $(e){return Math.round(1e6*e)/1e6}function Fe(e){var n,t,s,i,o,a;function m(u){a||(a=u),E(!0);var r=u-a;r>s&&(r=s);var l=i[t];if(l[3]<r)return t++,m(u);var p=l[2],c=l[4],b=l[0],x=l[1]*(0,l[5])(c===0?1:(r-p)/c);if(x&&e.track.to(b+x),r<s)return T();a=null,E(!1),f(null),e.emit("animationEnded")}function E(u){n.active=u}function f(u){n.targetIdx=u}function T(){var u;u=m,o=window.requestAnimationFrame(u)}function N(){var u;u=o,window.cancelAnimationFrame(u),E(!1),f(null),a&&e.emit("animationStopped"),a=null}return n={active:!1,start:function(u){if(N(),e.track.details){var r=0,l=e.track.details.position;t=0,s=0,i=u.map((function(p){var c,b=Number(l),x=(c=p.earlyExit)!==null&&c!==void 0?c:p.duration,g=p.easing,M=p.distance*g(x/p.duration)||0;l+=M;var C=s;return s+=x,r+=M,[b,p.distance,C,s,p.duration,g]})),f(e.track.distToIdx(r)),T(),e.emit("animationStarted")}},stop:N,targetIdx:null}}function Oe(e){var n,t,s,i,o,a,m,E,f,T,N,u,r,l,p=1/0,c=[],b=null,x=0;function g(v){D(x+v)}function M(v){var k=C(x+v).abs;return I(k)?k:null}function C(v){var k=Math.floor(Math.abs($(v/t))),d=$((v%t+t)%t);d===t&&(d=0);var L=j(v),h=m.indexOf(Me([],m).reduce((function(A,H){return Math.abs(H-d)<Math.abs(A-d)?H:A}))),B=h;return L<0&&k++,h===a&&(B=0,k+=L>0?1:-1),{abs:B+k*a*L,origin:h,rel:B}}function S(v,k,d){var L;if(k||!P())return y(v,d);if(!I(v))return null;var h=C(d??x),B=h.abs,A=v-h.rel,H=B+A;L=y(H);var _=y(H-a*j(A));return(_!==null&&Math.abs(_)<Math.abs(L)||L===null)&&(L=_),$(L)}function y(v,k){if(k==null&&(k=$(x)),!I(v)||v===null)return null;v=Math.round(v);var d=C(k),L=d.abs,h=d.rel,B=d.origin,A=R(v),H=(k%t+t)%t,_=m[B],Y=Math.floor((v-(L-h))/a)*t;return $(_-H-_+m[A]+Y+(B===a?t:0))}function I(v){return F(v)===v}function F(v){return ge(v,f,T)}function P(){return i.loop}function R(v){return(v%a+a)%a}function D(v){var k;k=v-x,c.push({distance:k,timestamp:Le()}),c.length>6&&(c=c.slice(-6)),x=$(v);var d=w().abs;if(d!==b){var L=b!==null;b=d,L&&e.emit("slideChanged")}}function w(v){var k=v?null:(function(){if(a){var d=P(),L=d?(x%t+t)%t:x,h=(d?x%t:x)-o[0][2],B=0-(h<0&&d?t-Math.abs(h):h),A=0,H=C(x),_=H.abs,Y=H.rel,le=o[Y][2],ce=o.map((function(Q,Ne){var U=B+A;(U<0-Q[0]||U>1)&&(U+=(Math.abs(U)>t-1&&d?t:0)*j(-U));var ke=Ne-Y,ye=j(ke),se=ke+_;d&&(ye===-1&&U>le&&(se+=a),ye===1&&U<le&&(se-=a),N!==null&&se<N&&(U+=t),u!==null&&se>u&&(U-=t));var ve=U+Q[0]+Q[1],He=Math.max(U>=0&&ve<=1?1:ve<0||U>1?0:U<0?Math.min(1,(Q[0]+U)/Q[0]):(1-U)/Q[0],0);return A+=Q[0]+Q[1],{abs:se,distance:i.rtl?-1*U+1-Q[0]:U,portion:He,size:Q[0]}}));return _=F(_),Y=R(_),{abs:F(_),length:s,max:l,maxIdx:T,min:r,minIdx:f,position:x,progress:d?L/t:x/s,rel:Y,slides:ce,slidesLength:t}}})();return n.details=k,e.emit("detailsChanged"),k}return n={absToRel:R,add:g,details:null,distToIdx:M,idxToDist:S,init:function(v){if((function(){if(i=e.options,o=(i.trackConfig||[]).map((function(h){return[z(h,"size",1),z(h,"spacing",0),z(h,"origin",0)]})),a=o.length){t=$(o.reduce((function(h,B){return h+B[0]+B[1]}),0));var d,L=a-1;s=$(t+o[0][2]-o[L][0]-o[L][2]-o[L][1]),m=o.reduce((function(h,B){if(!h)return[0];var A=o[h.length-1],H=h[h.length-1]+(A[0]+A[2])+A[1];return H-=B[2],h[h.length-1]>H&&(H=h[h.length-1]),H=$(H),h.push(H),(!d||d<H)&&(E=h.length-1),d=H,h}),null),s===0&&(E=0),m.push($(t))}})(),!a)return w(!0);var k;(function(){var d=e.options.range,L=e.options.loop;N=f=L?z(L,"min",-1/0):0,u=T=L?z(L,"max",p):E;var h=z(d,"min",null),B=z(d,"max",null);h!==null&&(f=h),B!==null&&(T=B),r=f===-1/0?f:e.track.idxToDist(f||0,!0,0),l=T===p?T:S(T,!0,0),B===null&&(u=T),z(d,"align",!1)&&T!==p&&o[R(T)][2]===0&&(l-=1-o[R(T)][0],T=M(l-x)),r=$(r),l=$(l)})(),k=v,Number(k)===k?g(y(F(v))):w()},to:D,velocity:function(){var v=Le(),k=c.reduce((function(d,L){var h=L.distance,B=L.timestamp;return v-B>200||(j(h)!==j(d.distance)&&d.distance&&(d={distance:0,lastTimestamp:0,time:0}),d.time&&(d.distance+=h),d.lastTimestamp&&(d.time+=B-d.lastTimestamp),d.lastTimestamp=B),d}),{distance:0,lastTimestamp:0,time:0});return k.distance/k.time||0}}}function Re(e){var n,t,s,i,o,a,m,E;function f(b){return 2*b}function T(b){return ge(b,m,E)}function N(b){return 1-Math.pow(1-b,3)}function u(){return s?e.track.velocity():0}function r(){c();var b=e.options.mode==="free-snap",x=e.track,g=u();i=j(g);var M=e.track.details,C=[];if(g||!b){var S=l(g),y=S.dist,I=S.dur;if(I=f(I),y*=i,b){var F=x.idxToDist(x.distToIdx(y),!0);F&&(y=F)}C.push({distance:y,duration:I,easing:N});var P=M.position,R=P+y;if(R<o||R>a){var D=R<o?o-P:a-P,w=0,v=g;if(j(D)===i){var k=Math.min(Math.abs(D)/Math.abs(y),1),d=(function(B){return 1-Math.pow(1-B,1/3)})(k)*I;C[0].earlyExit=d,v=g*(1-k)}else C[0].earlyExit=0,w+=D;var L=l(v,100),h=L.dist*i;e.options.rubberband&&(C.push({distance:h,duration:f(L.dur),easing:N}),C.push({distance:-h+w,duration:500,easing:N}))}e.animator.start(C)}else e.moveToIdx(T(M.abs),!0,{duration:500,easing:function(B){return 1+--B*B*B*B*B}})}function l(b,x){x===void 0&&(x=1e3);var g=147e-9+(b=Math.abs(b))/x;return{dist:Math.pow(b,2)/g,dur:b/g}}function p(){var b=e.track.details;b&&(o=b.min,a=b.max,m=b.minIdx,E=b.maxIdx)}function c(){e.animator.stop()}e.on("updated",p),e.on("optionsChanged",p),e.on("created",p),e.on("dragStarted",(function(){s=!1,c(),n=t=e.track.details.abs})),e.on("dragChecked",(function(){s=!0})),e.on("dragEnded",(function(){var b=e.options.mode;b==="snap"&&(function(){var x=e.track,g=e.track.details,M=g.position,C=j(u());(M>a||M<o)&&(C=0);var S=n+C;g.slides[x.absToRel(S)].portion===0&&(S-=C),n!==t&&(S=t),j(x.idxToDist(S,!0))!==C&&(S+=C),S=T(S);var y=x.idxToDist(S,!0);e.animator.start([{distance:y,duration:500,easing:function(I){return 1+--I*I*I*I*I}}])})(),b!=="free"&&b!=="free-snap"||r()})),e.on("dragged",(function(){t=e.track.details.abs}))}function De(e){var n,t,s,i,o,a,m,E,f,T,N,u,r,l,p,c,b,x,g=Ae();function M(w){if(a&&E===w.id){var v=I(w);if(f){if(!y(w))return S(w);T=v,f=!1,e.emit("dragChecked")}if(c)return T=v;oe(w);var k=(function(L){if(b===-1/0&&x===1/0)return L;var h=e.track.details,B=h.length,A=h.position,H=ge(L,b-A,x-A);if(B===0)return 0;if(!e.options.rubberband)return H;if(A<=x&&A>=b||A<b&&t>0||A>x&&t<0)return L;var _=(A<b?A-b:A-x)/B,Y=i*B,le=Math.abs(_*Y),ce=Math.max(0,1-le/o*2);return ce*ce*L})(m(T-v)/i*s);t=j(k);var d=e.track.details.position;(d>b&&d<x||d===b&&t>0||d===x&&t<0)&&ae(w),N+=k,!u&&Math.abs(N*i)>5&&(u=!0),e.track.add(k),T=v,e.emit("dragged")}}function C(w){!a&&e.track.details&&e.track.details.length&&(N=0,a=!0,u=!1,f=!0,E=w.id,y(w),T=I(w),e.emit("dragStarted"))}function S(w){a&&E===w.idChanged&&(a=!1,e.emit("dragEnded"))}function y(w){var v=F(),k=v?w.y:w.x,d=v?w.x:w.y,L=r!==void 0&&l!==void 0&&Math.abs(l-d)<=Math.abs(r-k);return r=k,l=d,L}function I(w){return F()?w.y:w.x}function F(){return e.options.vertical}function P(){i=e.size,o=F()?window.innerHeight:window.innerWidth;var w=e.track.details;w&&(b=w.min,x=w.max)}function R(w){u&&(ae(w),oe(w))}function D(){if(g.purge(),e.options.drag&&!e.options.disabled){var w;w=e.options.dragSpeed||1,m=typeof w=="function"?w:function(k){return k*w},s=e.options.rtl?-1:1,P(),n=e.container,(function(){var k="data-keen-slider-clickable";ue("[".concat(k,"]:not([").concat(k,"=false])"),n).map((function(d){g.add(d,"dragstart",ae),g.add(d,"mousedown",ae),g.add(d,"touchstart",ae)}))})(),g.add(n,"dragstart",(function(k){oe(k)})),g.add(n,"click",R,{capture:!0}),g.input(n,"ksDragStart",C),g.input(n,"ksDrag",M),g.input(n,"ksDragEnd",S),g.input(n,"mousedown",C),g.input(n,"mousemove",M),g.input(n,"mouseleave",S),g.input(n,"mouseup",S),g.input(n,"touchstart",C,{passive:!0}),g.input(n,"touchmove",M,{passive:!1}),g.input(n,"touchend",S),g.input(n,"touchcancel",S),g.add(window,"wheel",(function(k){a&&oe(k)}));var v="data-keen-slider-scrollable";ue("[".concat(v,"]:not([").concat(v,"=false])"),e.container).map((function(k){return(function(d){var L;g.input(d,"touchstart",(function(h){L=I(h),c=!0,p=!0}),{passive:!0}),g.input(d,"touchmove",(function(h){var B=F(),A=B?d.scrollHeight-d.clientHeight:d.scrollWidth-d.clientWidth,H=L-I(h),_=B?d.scrollTop:d.scrollLeft,Y=B&&d.style.overflowY==="scroll"||!B&&d.style.overflowX==="scroll";if(L=I(h),(H<0&&_>0||H>0&&_<A)&&p&&Y)return c=!0;p=!1,oe(h),c=!1})),g.input(d,"touchend",(function(){c=!1}))})(k)}))}}e.on("updated",P),e.on("optionsChanged",D),e.on("created",D),e.on("destroyed",g.purge)}function _e(e){var n,t,s=null;function i(r,l,p){e.animator.active?a(r,l,p):requestAnimationFrame((function(){return a(r,l,p)}))}function o(){i(!1,!1,t)}function a(r,l,p){var c=0,b=e.size,x=e.track.details;if(x&&n){var g=x.slides;n.forEach((function(M,C){if(r)!s&&l&&E(M,null,p),f(M,null,p);else{if(!g[C])return;var S=g[C].size*b;!s&&l&&E(M,S,p),f(M,g[C].distance*b-c,p),c+=S}}))}}function m(r){return e.options.renderMode==="performance"?Math.round(r):r}function E(r,l,p){var c=p?"height":"width";l!==null&&(l=m(l)+"px"),r.style["min-"+c]=l,r.style["max-"+c]=l}function f(r,l,p){if(l!==null){l=m(l);var c=p?l:0;l="translate3d(".concat(p?0:l,"px, ").concat(c,"px, 0)")}r.style.transform=l,r.style["-webkit-transform"]=l}function T(){n&&(a(!0,!0,t),n=null),e.on("detailsChanged",o,!0)}function N(){i(!1,!0,t)}function u(){T(),t=e.options.vertical,e.options.disabled||e.options.renderMode==="custom"||(s=z(e.options.slides,"perView",null)==="auto",e.on("detailsChanged",o),(n=e.slides).length&&N())}e.on("created",u),e.on("optionsChanged",u),e.on("beforeOptionsChanged",(function(){T()})),e.on("updated",N),e.on("destroyed",T)}function Pe(e,n){return function(t){var s,i,o,a,m,E=Ae();function f(y){var I;be(t.container,"reverse",(I=t.container,window.getComputedStyle(I,null).getPropertyValue("direction")!=="rtl"||y?null:"")),be(t.container,"v",t.options.vertical&&!y?"":null),be(t.container,"disabled",t.options.disabled&&!y?"":null)}function T(){N()&&c()}function N(){var y=null;if(a.forEach((function(F){F.matches&&(y=F.__media)})),y===s)return!1;s||t.emit("beforeOptionsChanged"),s=y;var I=y?o.breakpoints[y]:o;return t.options=ne(ne({},o),I),f(),C(),S(),x(),!0}function u(y){var I=Te(y);return(t.options.vertical?I.height:I.width)/t.size||1}function r(){return t.options.trackConfig.length}function l(y){for(var I in s=!1,o=ne(ne({},n),y),E.purge(),i=t.size,a=[],o.breakpoints||[]){var F=window.matchMedia(I);F.__media=I,a.push(F),E.add(F,"change",T)}E.add(window,"orientationchange",M),E.add(window,"resize",g),N()}function p(y){t.animator.stop();var I=t.track.details;t.track.init(y??(I?I.abs:0))}function c(y){p(y),t.emit("optionsChanged")}function b(y,I){if(y)return l(y),void c(I);C(),S();var F=r();x(),r()!==F?c(I):p(I),t.emit("updated")}function x(){var y=t.options.slides;if(typeof y=="function")return t.options.trackConfig=y(t.size,t.slides);for(var I=t.slides,F=I.length,P=typeof y=="number"?y:z(y,"number",F,!0),R=[],D=z(y,"perView",1,!0),w=z(y,"spacing",0,!0)/t.size||0,v=D==="auto"?w:w/D,k=z(y,"origin","auto"),d=0,L=0;L<P;L++){var h=D==="auto"?u(I[L]):1/D-w+v,B=k==="center"?.5-h/2:k==="auto"?0:k;R.push({origin:B,size:h,spacing:w}),d+=h}if(d+=w*(P-1),k==="auto"&&!t.options.loop&&D!==1){var A=0;R.map((function(H){var _=d-A;return A+=H.size+w,_>=1||(H.origin=1-_-(d>1?0:1-d)),H}))}t.options.trackConfig=R}function g(){C();var y=t.size;t.options.disabled||y===i||(i=y,b())}function M(){g(),setTimeout(g,500),setTimeout(g,2e3)}function C(){var y=Te(t.container);t.size=(t.options.vertical?y.height:y.width)||1}function S(){t.slides=ue(t.options.selector,t.container)}t.container=(m=ue(e,document)).length?m[0]:null,t.destroy=function(){E.purge(),t.emit("destroyed"),f(!0)},t.prev=function(){t.moveToIdx(t.track.details.abs-1,!0)},t.next=function(){t.moveToIdx(t.track.details.abs+1,!0)},t.update=b,l(t.options)}}var Be=function(e,n,t){try{return(function(s,i){var o,a={};return o={emit:function(m){a[m]&&a[m].forEach((function(f){f(o)}));var E=o.options&&o.options[m];E&&E(o)},moveToIdx:function(m,E,f){var T=o.track.idxToDist(m,E);if(T){var N=o.options.defaultAnimation;o.animator.start([{distance:T,duration:z(f||N,"duration",500),easing:z(f||N,"easing",(function(u){return 1+--u*u*u*u*u}))}])}},on:function(m,E,f){f===void 0&&(f=!1),a[m]||(a[m]=[]);var T=a[m].indexOf(E);T>-1?f&&delete a[m][T]:f||a[m].push(E)},options:s},(function(){if(o.track=Oe(o),o.animator=Fe(o),i)for(var m=0,E=i;m<E.length;m++)(0,E[m])(o);o.track.init(o.options.initial||0),o.emit("created")})(),o})(n,Me([Pe(e,{drag:!0,mode:"snap",renderMode:"precision",rubberband:!0,selector:".keen-slider__slide"}),_e,De,Re],t||[],!0))}catch(s){console.error(s)}};const Ie=Be.default||Be;let W=[],O=null,ee=null,G="tones",ie=null,te=null,de=null,Z=typeof Audio<"u"?new Audio:null;const pe=new Map;function he(){if(!te){const e=window.AudioContext||window.webkitAudioContext;e&&(te=new e)}return te&&te.state==="suspended"&&te.resume().catch(()=>{}),te}function fe(){if(navigator.audioSession&&navigator.audioSession.type!=="playback")try{navigator.audioSession.type="playback"}catch{}he(),!Z&&typeof Audio<"u"&&(Z=new Audio)}if(typeof window<"u"){const e=["touchstart","touchend","click","keydown"],n=()=>{fe()};e.forEach(t=>{window.addEventListener(t,n,{passive:!0})}),/iPhone|iPad|iPod|Android/.test(navigator.userAgent)&&(console.log("[DEBUG] Mobile UA detected:",navigator.userAgent),window.addEventListener("error",t=>{console.error("[DEBUG] Uncaught error:",t.message,"at",t.filename,"line",t.lineno)}),window.addEventListener("unhandledrejection",t=>{console.error("[DEBUG] Unhandled rejection:",t.reason)}))}function Se(e,n){return new Promise((t,s)=>{try{const i=n.slice(0);let o=!1;const a=e.decodeAudioData(i,m=>{o||(o=!0,t(m))},m=>{o||(o=!0,s(m))});a&&typeof a.then=="function"&&a.then(m=>{o||(o=!0,t(m))},m=>{o||(o=!0,s(m))})}catch(i){s(i)}})}async function Ue(e){if(!(!e||pe.has(e)))try{const n=he();if(!n)return;const t=await fetch(e);if(!t.ok)return;const s=await t.arrayBuffer(),i=await Se(n,s);i&&pe.set(e,i)}catch{}}let X=null,J=null,V=null,K=null;function ze(e){const n={ā:"a",á:"a",ǎ:"a",à:"a",ē:"e",é:"e",ě:"e",è:"e",ī:"i",í:"i",ǐ:"i",ì:"i",ō:"o",ó:"o",ǒ:"o",ò:"o",ū:"u",ú:"u",ǔ:"u",ù:"u",ǖ:"ü",ǘ:"ü",ǚ:"ü",ǜ:"ü"};return e.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g,t=>n[t])}function Ge(e){const n=e.replace("uu","ü").replace("v","ü").replace("lue","lüe").replace("nue","nüe"),t={a:"āáǎà",e:"ēéěè",i:"īíǐì",o:"ōóǒò",u:"ūúǔù",v:"ǖǘǚǜ",ü:"ǖǘǚǜ"};if(!n.slice(-1).match(/\d/))return n;try{const s=parseInt(n.slice(-1)),i=n.slice(0,-1);if(s===0||s===5)return i;let o=-1;for(const a of["a","e","o"])if(i.includes(a)){o=i.indexOf(a);break}if(o===-1){for(let a=i.length-1;a>=0;a--)if("iuvü".includes(i[a])){o=a;break}}if(o!==-1){let a=i[o];if(a==="v"&&(a="ü"),a in t)return i.slice(0,o)+t[a][s-1]+i.slice(o+1)}}catch{return n}return n}function q(e){const n=document.getElementById("app");n&&(n.className=n.className.replace(/bg-canvas-\w+/g,""),n.classList.add(e))}function $e(){const e=document.getElementById("menu-screen"),n=document.getElementById("game-screen"),t=document.getElementById("audio-library-screen"),s=document.getElementById("main-menu"),i=document.getElementById("submenu"),o=document.getElementById("start-tones-btn"),a=document.getElementById("open-submenu-btn"),m=document.getElementById("close-submenu-btn"),E=document.getElementById("open-library-btn"),f=document.getElementById("back-to-main-menu-btn"),T=document.getElementById("start-initials-btn"),N=document.getElementById("start-endings-btn"),u=document.getElementById("back-to-menu-btn"),r=document.getElementById("engine-screen"),l=document.getElementById("open-engine-btn"),p=document.getElementById("back-from-engine-btn");l&&l.addEventListener("click",()=>{e.classList.add("hidden"),s.classList.remove("hidden"),i.classList.add("hidden"),r&&r.classList.remove("hidden"),q("bg-canvas-ice"),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(1)}),p&&p.addEventListener("click",()=>{r&&r.classList.add("hidden"),e.classList.remove("hidden"),s.classList.remove("hidden"),q("bg-canvas-acid")}),a.addEventListener("click",()=>{s.classList.add("hidden"),i.classList.remove("hidden"),i.classList.add("flex"),q("bg-canvas-lavender")}),m.addEventListener("click",()=>{i.classList.add("hidden"),i.classList.remove("flex"),s.classList.remove("hidden"),q("bg-canvas-acid")}),E.addEventListener("click",()=>{e.classList.add("hidden"),s.classList.remove("hidden"),i.classList.add("hidden"),t.classList.remove("hidden"),q("bg-canvas-navy"),setTimeout(()=>{V&&V.update(),K&&K.update()},60)}),f.addEventListener("click",()=>{t.classList.add("hidden"),e.classList.remove("hidden"),s.classList.remove("hidden"),q("bg-canvas-acid")}),o.addEventListener("click",()=>xe("tones")),T.addEventListener("click",()=>xe("initials")),N.addEventListener("click",()=>xe("endings")),u.addEventListener("click",()=>{n.classList.add("hidden"),e.classList.remove("hidden"),G==="initials"||G==="endings"?(s.classList.add("hidden"),i.classList.remove("hidden"),i.classList.add("flex"),q("bg-canvas-lavender")):(i.classList.add("hidden"),i.classList.remove("flex"),s.classList.remove("hidden"),q("bg-canvas-acid")),document.querySelector(".options").style.display="grid",document.getElementById("play-btn").style.transform="scale(1)",document.getElementById("feedback").innerHTML="[IDENTIFY THE CORRECT TONE CONTOUR]"})}function xe(e){fe(),G=e,document.getElementById("menu-screen").classList.add("hidden"),document.getElementById("game-screen").classList.remove("hidden");const n=document.getElementById("game-mode-badge");e==="tones"?(q("bg-canvas-mint"),n&&(n.textContent="DRILL // TONE TRAINER")):e==="initials"?(q("bg-canvas-butter"),n&&(n.textContent="DRILL // INITIALS (声母)")):e==="endings"&&(q("bg-canvas-pink"),n&&(n.textContent="DRILL // ENDINGS (韵母)")),me()}async function qe(){try{const e=await fetch("/mandarin_tone_trainer/single_words.json");if(!e.ok)throw new Error("JSON not found in public folder");W=await e.json(),console.log("App Ready. Vocabulary loaded:",W.length),We(),setTimeout(()=>{document.querySelectorAll(".tone-btn").forEach(n=>n.classList.remove("pop-up"))},1e3)}catch(e){console.error("Initialization error:",e)}}async function re(e){fe();const n=typeof e=="string"&&e.trim().length>0?e.trim():O?`/mandarin_tone_trainer/${O.audio}`:null;if(console.log("[DEBUG] playAudio | customPath:",e,"| resolved:",n,"| currentItem:",O?O.audio:null),!n){console.warn("[DEBUG] playAudio: no audioPath, aborting");return}const t=he();if(console.log("[DEBUG] AudioContext state:",t?t.state:"null"),t)try{t.state==="suspended"&&(console.log("[DEBUG] Resuming suspended AudioContext..."),await t.resume(),console.log("[DEBUG] AudioContext state after resume:",t.state));let s=pe.get(n);if(s)console.log("[DEBUG] Using cached buffer for:",n);else{console.log("[DEBUG] Fetching audio:",n);const i=await fetch(n);if(console.log("[DEBUG] Fetch response:",i.status,i.ok),i.ok){const o=await i.arrayBuffer();s=await Se(t,o),s?(pe.set(n,s),console.log("[DEBUG] Buffer decoded and cached")):console.warn("[DEBUG] decodeAudioDataSafe returned null")}else console.error("[DEBUG] Fetch failed with status:",i.status)}if(s){if(de){try{de.stop()}catch{}de=null}const i=t.createBufferSource();i.buffer=s,i.connect(t.destination),i.start(0),de=i,console.log("[DEBUG] WebAudio playback started OK");return}}catch(s){console.warn("[DEBUG] Web Audio failed, falling back to HTMLAudio:",s)}try{Z||(Z=new Audio),Z.pause(),Z.currentTime=0,Z.src=n,console.log("[DEBUG] HTMLAudio .play() called for:",n);const s=Z.play();s&&typeof s.catch=="function"&&s.then(()=>console.log("[DEBUG] HTMLAudio play resolved OK")).catch(i=>console.error("[DEBUG] HTMLAudio play rejected:",i))}catch(s){console.error("[DEBUG] HTMLAudio threw synchronously:",s)}}function je(){document.querySelectorAll(".tone-btn").forEach((e,n)=>{e.addEventListener("click",t=>{fe();const s=e.querySelector(".option-text"),i=(s?s.textContent:e.textContent||"").trim().toLowerCase();let o=!1;if(G==="tones"){const a=(O.pinyin_correct||"").trim().toLowerCase();i===a&&(o=!0)}else if(G==="initials"){const a=(O.initial||"").trim().toLowerCase();(i===a||i==="∅"&&a==="")&&(o=!0)}else if(G==="endings"){const a=(O.ending_base||"").trim().toLowerCase();i===a&&(o=!0)}if(o){document.getElementById("feedback").innerHTML='<span class="bg-black text-canvas-acid px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider animate-bounce">CORRECT! +1</span>',document.querySelector(".options").style.display="none";const a=document.getElementById("fab-container");a.innerHTML=`
          <div class="w-14 h-14 rounded-2xl bg-canvas-acid text-black border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">check</span>
          </div>
        `,a.classList.remove("hidden"),document.getElementById("pinyin-display").innerHTML=`
            <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${O.hanzi}</div>
            <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${O.pinyin_correct}</div>
        `;const m=document.getElementById("explanation-box");let E="";if(G==="initials"||G==="endings"){const f=G==="initials"?O.initial||"∅":O.ending_base,T=G==="initials"?O.initial_explanation:O.final_explanation;E=`
                <div class="relative p-2 text-center">
                    <p class="font-mono text-xs sm:text-sm text-left text-black">
                        <strong class="font-speed font-black text-black">${f}:</strong> 
                        ${T}
                    </p>
                    <button id="next-question-btn" class="mt-3 px-5 py-2 rounded-full bg-black text-white hover:bg-badge-pink border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-hard-black flex items-center gap-2 mx-auto active-collapse transition-colors cursor-pointer">
                        <span>NEXT QUESTION</span>
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            `,m.innerHTML=E,m.classList.remove("hidden"),document.getElementById("next-question-btn").addEventListener("click",()=>me(),{once:!0})}else ee=W[Math.floor(Math.random()*W.length)],ee&&ee.audio&&Ue(`/mandarin_tone_trainer/${ee.audio}`),ie&&clearTimeout(ie),ie=setTimeout(me,1500)}else{document.getElementById("feedback").innerHTML='<span class="bg-badge-red text-white px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider">TRY AGAIN</span>';const a=document.getElementById("fab-container");a.innerHTML=`
          <div class="w-14 h-14 rounded-2xl bg-badge-red text-white border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">close</span>
          </div>
        `,a.classList.remove("hidden"),setTimeout(()=>{a.classList.add("hidden")},1e3),re()}})}),document.getElementById("play-btn").addEventListener("click",()=>re())}function me(){ie&&(clearTimeout(ie),ie=null),document.querySelector(".options").style.display="grid";const e=document.getElementById("play-btn");e.style.transform="scale(1)",document.getElementById("fab-container").classList.add("hidden"),document.getElementById("explanation-box").classList.add("hidden"),ee?(O=ee,ee=null):O=W[Math.floor(Math.random()*W.length)];const n=document.getElementById("pinyin-display"),t=document.querySelectorAll(".tone-btn");if(G==="tones"){n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${O.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${O.pinyin_base}</div>
      `;const s=["High","Rising","Dipping","Falling"];t.forEach((i,o)=>{i.querySelector(".option-text").textContent=O.tone_options[o];const a=i.querySelector(".tone-hint");a&&(a.textContent=s[o])})}else G==="initials"?(n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${O.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          <span class="inline-block w-6 md:w-8 border-b-4 border-black mb-1"></span>${O.ending_correct}
        </div>
      `,t.forEach((s,i)=>{s.querySelector(".option-text").textContent=O.initial_options[i]===""?"∅":O.initial_options[i];const o=s.querySelector(".tone-hint");o&&(o.textContent="")})):G==="endings"&&(n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${O.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          ${O.initial}<span class="inline-block w-8 md:w-12 border-b-4 border-black mb-1"></span>
        </div>
      `,t.forEach((s,i)=>{s.querySelector(".option-text").textContent=ze(O.ending_options[i]);const o=s.querySelector(".tone-hint");o&&(o.textContent="")}));t.forEach(s=>{s.offsetWidth}),document.getElementById("feedback").innerHTML='<span class="text-white/80">[IDENTIFY THE TARGET SOUND]</span>',re()}function Ce(e){let n=!1;e.on("created",()=>{e.container.addEventListener("wheel",t=>{if(t.preventDefault(),n)return;const s=t.deltaY;Math.abs(s)<8||(n=!0,s>0?e.next():e.prev(),setTimeout(()=>{n=!1},90))},{passive:!1})})}function We(){const e=document.getElementById("initials-scroller"),n=document.getElementById("finals-scroller"),t=document.getElementById("library-tone-modal"),s=document.getElementById("modal-pinyin-display"),i=document.getElementById("close-modal-btn"),o=document.getElementById("library-selection-display"),a=document.getElementById("library-main-play-btn"),m=[...new Set(W.map(u=>u.initial))].sort(),E=[...new Set(W.map(u=>u.ending_base))].sort();e.innerHTML="",n.innerHTML="",m.forEach((u,r)=>{const l=document.createElement("div");l.className="keen-slider__slide flex items-center justify-center cursor-pointer select-none",l.dataset.index=r;const p=document.createElement("span");p.className="slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150",p.textContent=u===""?"∅":u,l.appendChild(p),e.appendChild(l)}),E.forEach((u,r)=>{const l=document.createElement("div");l.className="keen-slider__slide flex items-center justify-center cursor-pointer select-none",l.dataset.index=r;const p=document.createElement("span");p.className="slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150",p.textContent=u,l.appendChild(p),n.appendChild(l)});function f(u,r){if(!u.track||!u.track.details)return;const l=u.track.details,p=u.container.querySelectorAll(".slide-label");l.slides.forEach((c,b)=>{const x=p[b];if(!x)return;const g=Math.abs(c.distance);g<.5?(x.style.opacity="1",x.style.transform=`scale(${1.2-g*.15})`,x.style.color=r==="initial"?"#000000":"#104FE2",x.style.fontWeight="900"):g<1.5?(x.style.opacity="0.6",x.style.transform="scale(0.95)",x.style.color="#000000",x.style.fontWeight="700"):g<2.5?(x.style.opacity="0.35",x.style.transform="scale(0.85)",x.style.color="#000000",x.style.fontWeight="600"):(x.style.opacity="0.15",x.style.transform="scale(0.75)",x.style.color="#000000",x.style.fontWeight="500")})}function T(){if(!V||!K||!V.track||!K.track||!V.track.details||!K.track.details)return;const u=V.track.details.rel,r=K.track.details.rel;X=m[u],J=E[r];const l=X==="∅"?"":X,p=l+J,c=W.filter(b=>b.initial===l&&b.ending_base===J);c.length>0?(o.innerHTML=`
                <span class="font-chinese font-black text-2xl sm:text-3xl text-black">${p}</span>
                <span class="ml-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-bold bg-black text-canvas-acid px-2 py-0.5 rounded border border-black shadow-sm">
                  ${c.length} TONE${c.length>1?"S":""}
                </span>
            `,a.disabled=!1):(o.innerHTML=`
                <span class="font-chinese text-2xl font-bold text-black/30 line-through">${p}</span>
                <span class="ml-2 font-mono text-xs uppercase tracking-wider text-badge-red font-black">(No syllable)</span>
            `,a.disabled=!0)}V=new Ie(e,{vertical:!0,mode:"free-snap",rubberband:!0,slides:{origin:"center",perView:7,spacing:0},initial:0,created(u){f(u,"initial")},detailsChanged(u){f(u,"initial")},slideChanged(){T()}},[Ce]),K=new Ie(n,{vertical:!0,mode:"free-snap",rubberband:!0,slides:{origin:"center",perView:7,spacing:0},initial:0,created(u){f(u,"final")},detailsChanged(u){f(u,"final")},slideChanged(){T()}},[Ce]),e.addEventListener("click",u=>{const r=u.target.closest(".keen-slider__slide");if(r&&V){const l=parseInt(r.dataset.index);V.moveToIdx(l,!0,{duration:250})}}),n.addEventListener("click",u=>{const r=u.target.closest(".keen-slider__slide");if(r&&K){const l=parseInt(r.dataset.index);K.moveToIdx(l,!0,{duration:250})}});function N(){(!X||!J)&&T();const u=X==="∅"?"":X,r=u+J;s.textContent=r,t.querySelectorAll(".tone-select-btn").forEach((p,c)=>{const b=c+1,x=Ge(`${r}${b}`);p.textContent=x,W.find(M=>M.initial===u&&M.ending_base===J&&M.tone===b)?(p.disabled=!1,p.classList.remove("opacity-30","cursor-not-allowed","pointer-events-none"),p.classList.add("hover:bg-white","cursor-pointer")):(p.disabled=!0,p.classList.add("opacity-30","cursor-not-allowed","pointer-events-none"),p.classList.remove("hover:bg-white","cursor-pointer"))}),t.classList.remove("hidden")}a.addEventListener("click",N),i.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",u=>{const r=u.target.closest(".tone-select-btn");if(r&&!r.disabled){const l=parseInt(r.dataset.tone),p=X==="∅"?"":X,c=W.find(b=>b.initial===p&&b.ending_base===J&&b.tone===l);if(c){const b=`/mandarin_tone_trainer/${c.audio}`;re(b)}else console.warn(`No audio found for ${p}${J}${l}`)}}),setTimeout(T,50)}window.addEventListener("keydown",e=>{const n=document.getElementById("game-screen"),t=document.getElementById("engine-screen");if(n&&!n.classList.contains("hidden"))if(e.key>="1"&&e.key<="4"){const s=parseInt(e.key)-1,i=document.querySelectorAll(".tone-btn")[s];i&&document.querySelector(".options").style.display!=="none"&&i.click()}else e.code==="Space"&&(e.preventDefault(),re());else if(t&&!t.classList.contains("hidden")&&e.code==="Space"){e.preventDefault();const s=document.getElementById("engine-record-btn");s&&s.click()}});function Ye(){const e=document.getElementById("engine-record-btn"),n=document.getElementById("engine-next-btn"),t=document.getElementById("engine-reset-btn"),s=document.getElementById("coach-hear-user-btn"),i=document.getElementById("engine-step-counter"),o=[{syllablesCount:2,hanzi:"你 好",pinyin:"nǐ hǎo",gloss:"Hello",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ní hǎo"},{syllablesCount:1,hanzi:"妈",pinyin:"mā",gloss:"Mother",sandhi:"/ Tone 1: High Level 55 /",spoken:"mā"},{syllablesCount:3,hanzi:"对 不 起",pinyin:"duì bu qǐ",gloss:"Sorry",sandhi:"/ 4th + Neutral + 3rd /",spoken:"duì bu qǐ"},{syllablesCount:2,hanzi:"可 以",pinyin:"kě yǐ",gloss:"Can / May",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ké yǐ"},{syllablesCount:1,hanzi:"好",pinyin:"hǎo",gloss:"Good",sandhi:"/ Tone 3: Low-Dipping 214 /",spoken:"hǎo"},{syllablesCount:3,hanzi:"冰 淇 淋",pinyin:"bīng qí lín",gloss:"Ice Cream",sandhi:"/ 1st + 2nd + 2nd /",spoken:"bīng qí lín"},{syllablesCount:2,hanzi:"水 果",pinyin:"shuǐ guǒ",gloss:"Fruit",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"shuí guǒ"},{syllablesCount:3,hanzi:"没 关 系",pinyin:"méi guān xi",gloss:"It's Okay",sandhi:"/ 2nd + 1st + Neutral /",spoken:"méi guān xi"},{syllablesCount:1,hanzi:"马",pinyin:"mǎ",gloss:"Horse",sandhi:"/ Tone 3: Low-Dipping 214 /",spoken:"mǎ"},{syllablesCount:2,hanzi:"手 表",pinyin:"shǒu biǎo",gloss:"Watch",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"shóu biǎo"}];let a=0;function m(r,l){document.querySelectorAll("#engine-syllable-toggle-group button").forEach((A,H)=>{H+1===r?A.className="px-2 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer":A.className="px-2 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer"});let c=l;c||(r===1?c={syllablesCount:1,hanzi:"妈",pinyin:"mā",gloss:"Mother",sandhi:"/ Tone 1: High Level 55 /",spoken:"mā"}:r===3?c={syllablesCount:3,hanzi:"对 不 起",pinyin:"duì bu qǐ",gloss:"Sorry",sandhi:"/ 4th + Neutral + 3rd /",spoken:"duì bu qǐ"}:c={syllablesCount:2,hanzi:"你 好",pinyin:"nǐ hǎo",gloss:"Hello",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ní hǎo"});const b=document.getElementById("engine-hanzi-display"),x=document.getElementById("engine-pinyin-display"),g=document.getElementById("engine-gloss-display"),M=document.getElementById("engine-stage-label"),C=document.getElementById("engine-sandhi-badge"),S=document.getElementById("engine-arena-subtitle");b&&(b.textContent=c.hanzi),x&&(x.textContent=c.pinyin),g&&(g.textContent=`"${c.gloss}"`),r===1?(M&&(M.textContent="[STAGE 1: ISOLATED SYLLABLE]"),S&&(S.textContent="CHAO 5-LEVEL SINGLE-CONTOUR"),C&&(C.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Isolated Tone Profile</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${c.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${c.spoken}</span>
        `)):r===3?(M&&(M.textContent="[STAGE 3: 3-SYLLABLE & NEUTRAL TONE]"),S&&(S.textContent="CHAO 5-LEVEL TRIPLE-CONTOUR"),C&&(C.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Compound Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${c.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${c.spoken}</span>
        `)):(M&&(M.textContent="[STAGE 2: TONE SANDHI]"),S&&(S.textContent="CHAO 5-LEVEL DUAL-CONTOUR"),C&&(C.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Sandhi Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${c.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${c.spoken}</span>
        `));const y=document.getElementById("pitch-chart-wrapper"),I=document.getElementById("pitch-chart-svg"),F=document.getElementById("pitch-grid-levels"),P=document.getElementById("pitch-syllable-dividers"),R=document.getElementById("pitch-target-ribbons"),D=document.getElementById("user-pitch-paths-container"),w=document.getElementById("user-pitch-points-container"),v=document.getElementById("engine-live-waveform-group"),k=document.getElementById("pitch-time-milestones"),d=document.getElementById("pitch-timeline-fill"),L=document.getElementById("pitch-timeline-text");if(r===1){y&&(y.className="flex gap-1.5 items-center justify-center max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] mx-auto my-auto transition-all duration-300"),I&&I.setAttribute("viewBox","0 0 350 155"),F&&(F.innerHTML=`
          <line x1="15" y1="15" x2="335" y2="15" />
          <line x1="15" y1="46" x2="335" y2="46" />
          <line x1="15" y1="78" x2="335" y2="78" />
          <line x1="15" y1="110" x2="335" y2="110" />
          <line x1="15" y1="140" x2="335" y2="140" />
        `),P&&(P.innerHTML="");const A=c.sandhi&&c.sandhi.includes("Dipping");R&&(A?R.innerHTML=`
            <polygon id="target-ribbon-s1" points="40,105 160,146 310,48 310,30 160,126 40,85" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `:R.innerHTML=`
            <polygon id="target-ribbon-s1" points="40,22 310,22 310,8 40,8" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),D&&(A?D.innerHTML=`
            <path id="user-pitch-path-s1" d="M 40,95 Q 160,142 310,40" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `:D.innerHTML=`
            <path id="user-pitch-path-s1" d="M 40,15 Q 175,13 310,15" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),w&&(A?w.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="100" cy="118" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="160" cy="142" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="235" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="40" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `:w.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="15" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="95" cy="14" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="150" cy="13" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="205" cy="13" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="260" cy="14" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="15" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `),v&&(v.innerHTML=`
          <path d="M 30,80 Q 70,50 110,80 T 190,80 T 270,80 T 320,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="175" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `),k&&(k.innerHTML=`
          <text x="40" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
          <text x="175" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[${c.pinyin}] ~320ms</text>
          <text x="310" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
        `),d&&(d.style.width="55%"),L&&(L.textContent="0.18s / 0.32s")}else y&&(y.className="flex gap-1.5 items-center justify-center w-full my-auto transition-all duration-300"),I&&I.setAttribute("viewBox","0 0 660 155"),F&&(F.innerHTML=`
          <line x1="20" y1="15" x2="640" y2="15" />
          <line x1="20" y1="46" x2="640" y2="46" />
          <line x1="20" y1="78" x2="640" y2="78" />
          <line x1="20" y1="110" x2="640" y2="110" />
          <line x1="20" y1="140" x2="640" y2="140" />
        `),v&&(v.innerHTML=`
          <path d="M 50,80 Q 90,50 130,80 T 210,80 T 290,80 T 370,80 T 450,80 T 530,80 T 610,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="330" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `),r===3?(P&&(P.innerHTML=`
            <line x1="225" y1="8" x2="225" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="231" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 2 [bu] ➔</text>
            <line x1="435" y1="8" x2="435" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="441" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 3 [qǐ] ➔</text>
          `),R&&(R.innerHTML=`
            <polygon id="target-ribbon-s1" points="35,16 195,135 195,115 35,6" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="245,95 405,102 405,86 245,80" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s3" points="455,98 535,146 625,56 625,38 535,126 455,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),D&&(D.innerHTML=`
            <path id="user-pitch-path-s1" d="M 35,18 Q 115,70 195,126" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 245,90 Q 325,92 405,96" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s3" d="M 455,92 Q 535,142 625,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),w&&(w.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="35" cy="18" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="115" cy="70" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="195" cy="126" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s2">
              <circle cx="245" cy="90" r="4" fill="#FDF197" stroke="#000" stroke-width="2" />
              <circle cx="325" cy="92" r="4" fill="#FF5C1C" stroke="#000" stroke-width="2" />
              <circle cx="405" cy="96" r="4" fill="#FF5C1C" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s3">
              <circle cx="455" cy="92" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="535" cy="142" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="625" cy="48" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `),k&&(k.innerHTML=`
            <text x="35" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="115" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[duì]</text>
            <text x="195" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.28s</text>
            <text x="245" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.30s</text>
            <text x="325" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[bu]</text>
            <text x="405" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.46s</text>
            <text x="455" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.48s</text>
            <text x="540" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[qǐ]</text>
            <text x="625" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.85s</text>
          `),d&&(d.style.width="55%"),L&&(L.textContent="0.46s / 0.85s")):(P&&(P.innerHTML=`
            <line x1="330" y1="8" x2="330" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="336" y="20" class="font-mono text-[9px] fill-black/60 font-black">SYLLABLE 2 [hǎo] ➔</text>
          `),R&&(R.innerHTML=`
            <polygon id="target-ribbon-s1" points="70,95 300,28 300,10 70,75" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="360,98 470,146 600,52 600,32 470,126 360,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),D&&(D.innerHTML=`
            <path id="user-pitch-path-s1" d="M 70,85 Q 180,54 300,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 360,88 Q 465,138 600,45" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),w&&(w.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="70" cy="85" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="120" cy="70" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="180" cy="58" r="4.5" fill="#FDF197" stroke="#000" stroke-width="2" />
              <circle cx="240" cy="50" r="5" fill="#FF5C1C" stroke="#000" stroke-width="2" />
              <circle cx="300" cy="48" r="5" fill="#FF5C1C" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s2">
              <circle cx="360" cy="88" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="410" cy="112" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="465" cy="138" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="530" cy="90" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="600" cy="45" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `),k&&(k.innerHTML=`
            <text x="70" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="180" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: n] [Final: í]</text>
            <text x="300" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
            <text x="360" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.34s</text>
            <text x="480" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: h] [Final: ǎo]</text>
            <text x="600" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.72s</text>
          `),d&&(d.style.width="45%"),L&&(L.textContent="0.32s / 0.72s"));const h=document.getElementById("phonetic-audit-grid");h&&(r===1?(h.className="grid grid-cols-1 max-w-sm sm:max-w-md mx-auto gap-2",h.innerHTML=`
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 1: [${c.pinyin}]</span>
              <span class="font-mono text-[9px] font-black text-black bg-canvas-acid px-1.5 py-0.2 rounded border border-black">ACCURATE CONTOUR</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: m</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">96%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: a</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">92%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Exact</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black font-black">TONE: 1</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">98%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ 55 Flat</span>
              </div>
            </div>
          </div>
        `):r===3?(h.className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2",h.innerHTML=`
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 1: [duì]</span>
              <span class="font-mono text-[8px] font-black text-black bg-canvas-acid px-1 rounded border border-black">✓ 4TH</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: d</span>
                <span class="font-speed font-black text-xs text-black">91%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: ui</span>
                <span class="font-speed font-black text-xs text-black">88%</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black font-black">TONE: 4</span>
                <span class="font-speed font-black text-xs text-black">94%</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 2: [bu]</span>
              <span class="font-mono text-[8px] font-black text-white bg-badge-tangerine px-1 rounded border border-black">⚠ STRESSED</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: b</span>
                <span class="font-speed font-black text-xs text-black">89%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: u</span>
                <span class="font-speed font-black text-xs text-black">92%</span>
              </div>
              <div class="bg-badge-tangerine/15 border border-badge-tangerine rounded-lg p-0.5">
                <span class="block text-[8px] text-badge-tangerine font-black">NEUTRAL</span>
                <span class="font-speed font-black text-xs text-badge-tangerine">62%</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 3: [qǐ]</span>
              <span class="font-mono text-[8px] font-black text-black bg-canvas-acid px-1 rounded border border-black">✓ 3RD</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: q</span>
                <span class="font-speed font-black text-xs text-black">85%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: i</span>
                <span class="font-speed font-black text-xs text-black">90%</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black font-black">TONE: 3</span>
                <span class="font-speed font-black text-xs text-black">93%</span>
              </div>
            </div>
          </div>
        `):(h.className="grid grid-cols-1 sm:grid-cols-2 gap-2",h.innerHTML=`
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 1: [ní]</span>
              <span class="font-mono text-[9px] font-black text-white bg-badge-tangerine px-1.5 py-0.2 rounded border border-black">TONE DIVERGENCE</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: n</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">94%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: i</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">90%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Exact</span>
              </div>
              <div class="bg-badge-tangerine/15 border-2 border-badge-tangerine rounded-lg p-1">
                <span class="block text-[8px] text-badge-tangerine font-black">TONE: 2</span>
                <span class="font-speed font-black text-xs sm:text-sm text-badge-tangerine">61%</span>
                <span class="block text-[8px] text-badge-tangerine font-bold">⚠ Flat</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 2: [hǎo]</span>
              <span class="font-mono text-[9px] font-black text-black bg-canvas-acid px-1.5 py-0.2 rounded border border-black">ACCURATE CONTOUR</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: h</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">89%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: ao</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">85%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Open</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">TONE: 3</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">94%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Dipped</span>
              </div>
            </div>
          </div>
        `));const B=document.getElementById("coach-advice-text");B&&(r===1?B.innerHTML='"Laser-flat pitch! Keep your voice steady at <strong class="bg-black text-white px-1.5 py-0.5 rounded">Level 5 (55)</strong> without letting it drift down at the end."':r===3?B.innerHTML=`"On the neutral tone <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'bu'</strong>, keep it ultra-brief (~100ms) and light. Do not stress or lengthen it—it should bounce smoothly into <em class="text-badge-cobalt font-black">'qǐ'</em>."`:B.innerHTML=`"You flattened out too early on <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'ní'</strong>. Keep your pitch climbing all the way to the top, like asking a surprised question: <em class="text-badge-cobalt font-black">'Really?!'</em>"`)}let E=1,f=null;function T(){f&&(clearTimeout(f),f=null),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(4)}function N(){f&&(clearTimeout(f),f=null),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(2),f=setTimeout(()=>{T()},1800)}function u(r){a=Math.max(0,Math.min(r,o.length-1));const l=o[a];l&&m(l.syllablesCount,l),i&&(i.textContent=`STEP ${a+1} / ${o.length}`),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(1)}n&&n.addEventListener("click",()=>{const r=(a+1)%o.length;u(r)}),t&&t.addEventListener("click",()=>{u(0),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(1)}),s&&s.addEventListener("click",()=>{const r=s.innerHTML;s.innerHTML='<span class="material-symbols-outlined text-sm animate-spin">sync</span> PLAYING USER TRACK...',s.classList.add("bg-badge-tangerine","text-white"),setTimeout(()=>{s.innerHTML=r,s.classList.remove("bg-badge-tangerine","text-white")},1200)}),e&&e.addEventListener("click",()=>{E===2?T():N()}),window.PronunciationEngine={setRevealState(r){E=r,r!==2&&f&&(clearTimeout(f),f=null);const l=document.getElementById("user-voice-track-group"),p=document.getElementById("engine-live-waveform-group"),c=document.getElementById("phonetic-audit-section"),b=document.getElementById("articulatory-coach-card");document.querySelectorAll("#engine-state-toggle-group button").forEach((g,M)=>{(M===0?1:M===1?2:4)===r?g.className="px-1.5 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer":g.className="px-1.5 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer"}),r===1?(l&&l.classList.add("hidden"),p&&p.classList.add("hidden"),c&&c.classList.add("hidden"),b&&b.classList.add("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">RECORD</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `)):r===2?(l&&l.classList.add("hidden"),p&&p.classList.remove("hidden"),c&&c.classList.add("hidden"),b&&b.classList.add("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-black text-badge-tangerine border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-badge-tangerine animate-ping border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">RECORDING...</span>
            <span class="font-mono text-[10px] bg-badge-tangerine text-black px-1.5 py-0.5 rounded hidden sm:inline">[STOP]</span>
          `)):(l&&l.classList.remove("hidden"),p&&p.classList.add("hidden"),c&&c.classList.remove("hidden"),b&&b.classList.remove("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TRY AGAIN</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `))},setSyllableCount(r,l){m(r,l),window.PronunciationEngine.setRevealState(1)},setTargetWord(r){r.syllablesCount?m(r.syllablesCount,r):(r.hanzi&&(document.getElementById("engine-hanzi-display").textContent=r.hanzi),r.pinyin&&(document.getElementById("engine-pinyin-display").textContent=r.pinyin),r.gloss&&(document.getElementById("engine-gloss-display").textContent=`"${r.gloss}"`)),window.PronunciationEngine.setRevealState(1)},selectWordIndex(r){u(r)},updateUserCurves({pathS1:r,pathS2:l,pathS3:p}){if(r){const c=document.getElementById("user-pitch-path-s1");c&&c.setAttribute("d",r)}if(l){const c=document.getElementById("user-pitch-path-s2");c&&c.setAttribute("d",l)}if(p){const c=document.getElementById("user-pitch-path-s3");c&&c.setAttribute("d",p)}},updateTargetRibbons({pointsS1:r,pointsS2:l,pointsS3:p}){if(r){const c=document.getElementById("target-ribbon-s1");c&&c.setAttribute("points",r)}if(l){const c=document.getElementById("target-ribbon-s2");c&&c.setAttribute("points",l)}if(p){const c=document.getElementById("target-ribbon-s3");c&&c.setAttribute("points",p)}},setCoachingAdvice(r){const l=document.getElementById("coach-advice-text");l&&(l.innerHTML=r)}},u(0),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(1)}je();$e();Ye();qe();
