(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(s){if(s.ep)return;s.ep=!0;const a=t(s);fetch(s.href,a)}})();var ne=function(){return ne=Object.assign||function(e){for(var n,t=1,i=arguments.length;t<i;t++)for(var s in n=arguments[t])Object.prototype.hasOwnProperty.call(n,s)&&(e[s]=n[s]);return e},ne.apply(this,arguments)};function Me(e,n,t){for(var i,s=0,a=n.length;s<a;s++)!i&&s in n||(i||(i=Array.prototype.slice.call(n,0,s)),i[s]=n[s]);return e.concat(i||Array.prototype.slice.call(n))}function Le(e){return Array.prototype.slice.call(e)}function we(e,n){var t=Math.floor(e);return t===n||t+1===n?e:n}function Ee(){return Date.now()}function be(e,n,t){if(n="data-keen-slider-"+n,t===null)return e.removeAttribute(n);e.setAttribute(n,t||"")}function ue(e,n){return n=n||document,typeof e=="function"&&(e=e(n)),Array.isArray(e)?e:typeof e=="string"?Le(n.querySelectorAll(e)):e instanceof HTMLElement?[e]:e instanceof NodeList?Le(e):[]}function ae(e){e.raw&&(e=e.raw),e.cancelable&&!e.defaultPrevented&&e.preventDefault()}function oe(e){e.raw&&(e=e.raw),e.stopPropagation&&e.stopPropagation()}function Ae(){var e=[];return{add:function(n,t,i,s){n.addListener?n.addListener(i):n.addEventListener(t,i,s),e.push([n,t,i,s])},input:function(n,t,i,s){this.add(n,t,(function(a){return function(o){o.nativeEvent&&(o=o.nativeEvent);var m=o.changedTouches||[],L=o.targetTouches||[],x=o.detail&&o.detail.x?o.detail:null;return a({id:x?x.identifier?x.identifier:"i":L[0]?L[0]?L[0].identifier:"e":"d",idChanged:x?x.identifier?x.identifier:"i":m[0]?m[0]?m[0].identifier:"e":"d",raw:o,x:x&&x.x?x.x:L[0]?L[0].screenX:x?x.x:o.pageX,y:x&&x.y?x.y:L[0]?L[0].screenY:x?x.y:o.pageY})}})(i),s)},purge:function(){e.forEach((function(n){n[0].removeListener?n[0].removeListener(n[2]):n[0].removeEventListener(n[1],n[2],n[3])})),e=[]}}}function ge(e,n,t){return Math.min(Math.max(e,n),t)}function W(e){return(e>0?1:0)-(e<0?1:0)||+e}function Te(e){var n=e.getBoundingClientRect();return{height:we(n.height,e.offsetHeight),width:we(n.width,e.offsetWidth)}}function D(e,n,t,i){var s=e&&e[n];return s==null?t:i&&typeof s=="function"?s():s}function Y(e){return Math.round(1e6*e)/1e6}function Fe(e){var n,t,i,s,a,o;function m(c){o||(o=c),L(!0);var r=c-o;r>i&&(r=i);var d=s[t];if(d[3]<r)return t++,m(c);var b=d[2],I=d[4],f=d[0],p=d[1]*(0,d[5])(I===0?1:(r-b)/I);if(p&&e.track.to(f+p),r<i)return l();o=null,L(!1),x(null),e.emit("animationEnded")}function L(c){n.active=c}function x(c){n.targetIdx=c}function l(){var c;c=m,a=window.requestAnimationFrame(c)}function v(){var c;c=a,window.cancelAnimationFrame(c),L(!1),x(null),o&&e.emit("animationStopped"),o=null}return n={active:!1,start:function(c){if(v(),e.track.details){var r=0,d=e.track.details.position;t=0,i=0,s=c.map((function(b){var I,f=Number(d),p=(I=b.earlyExit)!==null&&I!==void 0?I:b.duration,g=b.easing,S=b.distance*g(p/b.duration)||0;d+=S;var M=i;return i+=p,r+=S,[f,b.distance,M,i,b.duration,g]})),x(e.track.distToIdx(r)),l(),e.emit("animationStarted")}},stop:v,targetIdx:null}}function Oe(e){var n,t,i,s,a,o,m,L,x,l,v,c,r,d,b=1/0,I=[],f=null,p=0;function g(y){_(p+y)}function S(y){var k=M(p+y).abs;return C(k)?k:null}function M(y){var k=Math.floor(Math.abs(Y(y/t))),u=Y((y%t+t)%t);u===t&&(u=0);var T=W(y),w=m.indexOf(Me([],m).reduce((function(H,F){return Math.abs(F-u)<Math.abs(H-u)?F:H}))),B=w;return T<0&&k++,w===o&&(B=0,k+=T>0?1:-1),{abs:B+k*o*T,origin:w,rel:B}}function A(y,k,u){var T;if(k||!R())return h(y,u);if(!C(y))return null;var w=M(u??p),B=w.abs,H=y-w.rel,F=B+H;T=h(F);var q=h(F-o*W(H));return(q!==null&&Math.abs(q)<Math.abs(T)||T===null)&&(T=q),Y(T)}function h(y,k){if(k==null&&(k=Y(p)),!C(y)||y===null)return null;y=Math.round(y);var u=M(k),T=u.abs,w=u.rel,B=u.origin,H=z(y),F=(k%t+t)%t,q=m[B],G=Math.floor((y-(T-w))/o)*t;return Y(q-F-q+m[H]+G+(B===o?t:0))}function C(y){return N(y)===y}function N(y){return ge(y,x,l)}function R(){return s.loop}function z(y){return(y%o+o)%o}function _(y){var k;k=y-p,I.push({distance:k,timestamp:Ee()}),I.length>6&&(I=I.slice(-6)),p=Y(y);var u=E().abs;if(u!==f){var T=f!==null;f=u,T&&e.emit("slideChanged")}}function E(y){var k=y?null:(function(){if(o){var u=R(),T=u?(p%t+t)%t:p,w=(u?p%t:p)-a[0][2],B=0-(w<0&&u?t-Math.abs(w):w),H=0,F=M(p),q=F.abs,G=F.rel,le=a[G][2],ce=a.map((function(Q,Ne){var $=B+H;($<0-Q[0]||$>1)&&($+=(Math.abs($)>t-1&&u?t:0)*W(-$));var ke=Ne-G,ye=W(ke),ie=ke+q;u&&(ye===-1&&$>le&&(ie+=o),ye===1&&$<le&&(ie-=o),v!==null&&ie<v&&($+=t),c!==null&&ie>c&&($-=t));var ve=$+Q[0]+Q[1],He=Math.max($>=0&&ve<=1?1:ve<0||$>1?0:$<0?Math.min(1,(Q[0]+$)/Q[0]):(1-$)/Q[0],0);return H+=Q[0]+Q[1],{abs:ie,distance:s.rtl?-1*$+1-Q[0]:$,portion:He,size:Q[0]}}));return q=N(q),G=z(q),{abs:N(q),length:i,max:d,maxIdx:l,min:r,minIdx:x,position:p,progress:u?T/t:p/i,rel:G,slides:ce,slidesLength:t}}})();return n.details=k,e.emit("detailsChanged"),k}return n={absToRel:z,add:g,details:null,distToIdx:S,idxToDist:A,init:function(y){if((function(){if(s=e.options,a=(s.trackConfig||[]).map((function(w){return[D(w,"size",1),D(w,"spacing",0),D(w,"origin",0)]})),o=a.length){t=Y(a.reduce((function(w,B){return w+B[0]+B[1]}),0));var u,T=o-1;i=Y(t+a[0][2]-a[T][0]-a[T][2]-a[T][1]),m=a.reduce((function(w,B){if(!w)return[0];var H=a[w.length-1],F=w[w.length-1]+(H[0]+H[2])+H[1];return F-=B[2],w[w.length-1]>F&&(F=w[w.length-1]),F=Y(F),w.push(F),(!u||u<F)&&(L=w.length-1),u=F,w}),null),i===0&&(L=0),m.push(Y(t))}})(),!o)return E(!0);var k;(function(){var u=e.options.range,T=e.options.loop;v=x=T?D(T,"min",-1/0):0,c=l=T?D(T,"max",b):L;var w=D(u,"min",null),B=D(u,"max",null);w!==null&&(x=w),B!==null&&(l=B),r=x===-1/0?x:e.track.idxToDist(x||0,!0,0),d=l===b?l:A(l,!0,0),B===null&&(c=l),D(u,"align",!1)&&l!==b&&a[z(l)][2]===0&&(d-=1-a[z(l)][0],l=S(d-p)),r=Y(r),d=Y(d)})(),k=y,Number(k)===k?g(h(N(y))):E()},to:_,velocity:function(){var y=Ee(),k=I.reduce((function(u,T){var w=T.distance,B=T.timestamp;return y-B>200||(W(w)!==W(u.distance)&&u.distance&&(u={distance:0,lastTimestamp:0,time:0}),u.time&&(u.distance+=w),u.lastTimestamp&&(u.time+=B-u.lastTimestamp),u.lastTimestamp=B),u}),{distance:0,lastTimestamp:0,time:0});return k.distance/k.time||0}}}function _e(e){var n,t,i,s,a,o,m,L;function x(f){return 2*f}function l(f){return ge(f,m,L)}function v(f){return 1-Math.pow(1-f,3)}function c(){return i?e.track.velocity():0}function r(){I();var f=e.options.mode==="free-snap",p=e.track,g=c();s=W(g);var S=e.track.details,M=[];if(g||!f){var A=d(g),h=A.dist,C=A.dur;if(C=x(C),h*=s,f){var N=p.idxToDist(p.distToIdx(h),!0);N&&(h=N)}M.push({distance:h,duration:C,easing:v});var R=S.position,z=R+h;if(z<a||z>o){var _=z<a?a-R:o-R,E=0,y=g;if(W(_)===s){var k=Math.min(Math.abs(_)/Math.abs(h),1),u=(function(B){return 1-Math.pow(1-B,1/3)})(k)*C;M[0].earlyExit=u,y=g*(1-k)}else M[0].earlyExit=0,E+=_;var T=d(y,100),w=T.dist*s;e.options.rubberband&&(M.push({distance:w,duration:x(T.dur),easing:v}),M.push({distance:-w+E,duration:500,easing:v}))}e.animator.start(M)}else e.moveToIdx(l(S.abs),!0,{duration:500,easing:function(B){return 1+--B*B*B*B*B}})}function d(f,p){p===void 0&&(p=1e3);var g=147e-9+(f=Math.abs(f))/p;return{dist:Math.pow(f,2)/g,dur:f/g}}function b(){var f=e.track.details;f&&(a=f.min,o=f.max,m=f.minIdx,L=f.maxIdx)}function I(){e.animator.stop()}e.on("updated",b),e.on("optionsChanged",b),e.on("created",b),e.on("dragStarted",(function(){i=!1,I(),n=t=e.track.details.abs})),e.on("dragChecked",(function(){i=!0})),e.on("dragEnded",(function(){var f=e.options.mode;f==="snap"&&(function(){var p=e.track,g=e.track.details,S=g.position,M=W(c());(S>o||S<a)&&(M=0);var A=n+M;g.slides[p.absToRel(A)].portion===0&&(A-=M),n!==t&&(A=t),W(p.idxToDist(A,!0))!==M&&(A+=M),A=l(A);var h=p.idxToDist(A,!0);e.animator.start([{distance:h,duration:500,easing:function(C){return 1+--C*C*C*C*C}}])})(),f!=="free"&&f!=="free-snap"||r()})),e.on("dragged",(function(){t=e.track.details.abs}))}function Re(e){var n,t,i,s,a,o,m,L,x,l,v,c,r,d,b,I,f,p,g=Ae();function S(E){if(o&&L===E.id){var y=C(E);if(x){if(!h(E))return A(E);l=y,x=!1,e.emit("dragChecked")}if(I)return l=y;ae(E);var k=(function(T){if(f===-1/0&&p===1/0)return T;var w=e.track.details,B=w.length,H=w.position,F=ge(T,f-H,p-H);if(B===0)return 0;if(!e.options.rubberband)return F;if(H<=p&&H>=f||H<f&&t>0||H>p&&t<0)return T;var q=(H<f?H-f:H-p)/B,G=s*B,le=Math.abs(q*G),ce=Math.max(0,1-le/a*2);return ce*ce*T})(m(l-y)/s*i);t=W(k);var u=e.track.details.position;(u>f&&u<p||u===f&&t>0||u===p&&t<0)&&oe(E),v+=k,!c&&Math.abs(v*s)>5&&(c=!0),e.track.add(k),l=y,e.emit("dragged")}}function M(E){!o&&e.track.details&&e.track.details.length&&(v=0,o=!0,c=!1,x=!0,L=E.id,h(E),l=C(E),e.emit("dragStarted"))}function A(E){o&&L===E.idChanged&&(o=!1,e.emit("dragEnded"))}function h(E){var y=N(),k=y?E.y:E.x,u=y?E.x:E.y,T=r!==void 0&&d!==void 0&&Math.abs(d-u)<=Math.abs(r-k);return r=k,d=u,T}function C(E){return N()?E.y:E.x}function N(){return e.options.vertical}function R(){s=e.size,a=N()?window.innerHeight:window.innerWidth;var E=e.track.details;E&&(f=E.min,p=E.max)}function z(E){c&&(oe(E),ae(E))}function _(){if(g.purge(),e.options.drag&&!e.options.disabled){var E;E=e.options.dragSpeed||1,m=typeof E=="function"?E:function(k){return k*E},i=e.options.rtl?-1:1,R(),n=e.container,(function(){var k="data-keen-slider-clickable";ue("[".concat(k,"]:not([").concat(k,"=false])"),n).map((function(u){g.add(u,"dragstart",oe),g.add(u,"mousedown",oe),g.add(u,"touchstart",oe)}))})(),g.add(n,"dragstart",(function(k){ae(k)})),g.add(n,"click",z,{capture:!0}),g.input(n,"ksDragStart",M),g.input(n,"ksDrag",S),g.input(n,"ksDragEnd",A),g.input(n,"mousedown",M),g.input(n,"mousemove",S),g.input(n,"mouseleave",A),g.input(n,"mouseup",A),g.input(n,"touchstart",M,{passive:!0}),g.input(n,"touchmove",S,{passive:!1}),g.input(n,"touchend",A),g.input(n,"touchcancel",A),g.add(window,"wheel",(function(k){o&&ae(k)}));var y="data-keen-slider-scrollable";ue("[".concat(y,"]:not([").concat(y,"=false])"),e.container).map((function(k){return(function(u){var T;g.input(u,"touchstart",(function(w){T=C(w),I=!0,b=!0}),{passive:!0}),g.input(u,"touchmove",(function(w){var B=N(),H=B?u.scrollHeight-u.clientHeight:u.scrollWidth-u.clientWidth,F=T-C(w),q=B?u.scrollTop:u.scrollLeft,G=B&&u.style.overflowY==="scroll"||!B&&u.style.overflowX==="scroll";if(T=C(w),(F<0&&q>0||F>0&&q<H)&&b&&G)return I=!0;b=!1,ae(w),I=!1})),g.input(u,"touchend",(function(){I=!1}))})(k)}))}}e.on("updated",R),e.on("optionsChanged",_),e.on("created",_),e.on("destroyed",g.purge)}function ze(e){var n,t,i=null;function s(r,d,b){e.animator.active?o(r,d,b):requestAnimationFrame((function(){return o(r,d,b)}))}function a(){s(!1,!1,t)}function o(r,d,b){var I=0,f=e.size,p=e.track.details;if(p&&n){var g=p.slides;n.forEach((function(S,M){if(r)!i&&d&&L(S,null,b),x(S,null,b);else{if(!g[M])return;var A=g[M].size*f;!i&&d&&L(S,A,b),x(S,g[M].distance*f-I,b),I+=A}}))}}function m(r){return e.options.renderMode==="performance"?Math.round(r):r}function L(r,d,b){var I=b?"height":"width";d!==null&&(d=m(d)+"px"),r.style["min-"+I]=d,r.style["max-"+I]=d}function x(r,d,b){if(d!==null){d=m(d);var I=b?d:0;d="translate3d(".concat(b?0:d,"px, ").concat(I,"px, 0)")}r.style.transform=d,r.style["-webkit-transform"]=d}function l(){n&&(o(!0,!0,t),n=null),e.on("detailsChanged",a,!0)}function v(){s(!1,!0,t)}function c(){l(),t=e.options.vertical,e.options.disabled||e.options.renderMode==="custom"||(i=D(e.options.slides,"perView",null)==="auto",e.on("detailsChanged",a),(n=e.slides).length&&v())}e.on("created",c),e.on("optionsChanged",c),e.on("beforeOptionsChanged",(function(){l()})),e.on("updated",v),e.on("destroyed",l)}function qe(e,n){return function(t){var i,s,a,o,m,L=Ae();function x(h){var C;be(t.container,"reverse",(C=t.container,window.getComputedStyle(C,null).getPropertyValue("direction")!=="rtl"||h?null:"")),be(t.container,"v",t.options.vertical&&!h?"":null),be(t.container,"disabled",t.options.disabled&&!h?"":null)}function l(){v()&&I()}function v(){var h=null;if(o.forEach((function(N){N.matches&&(h=N.__media)})),h===i)return!1;i||t.emit("beforeOptionsChanged"),i=h;var C=h?a.breakpoints[h]:a;return t.options=ne(ne({},a),C),x(),M(),A(),p(),!0}function c(h){var C=Te(h);return(t.options.vertical?C.height:C.width)/t.size||1}function r(){return t.options.trackConfig.length}function d(h){for(var C in i=!1,a=ne(ne({},n),h),L.purge(),s=t.size,o=[],a.breakpoints||[]){var N=window.matchMedia(C);N.__media=C,o.push(N),L.add(N,"change",l)}L.add(window,"orientationchange",S),L.add(window,"resize",g),v()}function b(h){t.animator.stop();var C=t.track.details;t.track.init(h??(C?C.abs:0))}function I(h){b(h),t.emit("optionsChanged")}function f(h,C){if(h)return d(h),void I(C);M(),A();var N=r();p(),r()!==N?I(C):b(C),t.emit("updated")}function p(){var h=t.options.slides;if(typeof h=="function")return t.options.trackConfig=h(t.size,t.slides);for(var C=t.slides,N=C.length,R=typeof h=="number"?h:D(h,"number",N,!0),z=[],_=D(h,"perView",1,!0),E=D(h,"spacing",0,!0)/t.size||0,y=_==="auto"?E:E/_,k=D(h,"origin","auto"),u=0,T=0;T<R;T++){var w=_==="auto"?c(C[T]):1/_-E+y,B=k==="center"?.5-w/2:k==="auto"?0:k;z.push({origin:B,size:w,spacing:E}),u+=w}if(u+=E*(R-1),k==="auto"&&!t.options.loop&&_!==1){var H=0;z.map((function(F){var q=u-H;return H+=F.size+E,q>=1||(F.origin=1-q-(u>1?0:1-u)),F}))}t.options.trackConfig=z}function g(){M();var h=t.size;t.options.disabled||h===s||(s=h,f())}function S(){g(),setTimeout(g,500),setTimeout(g,2e3)}function M(){var h=Te(t.container);t.size=(t.options.vertical?h.height:h.width)||1}function A(){t.slides=ue(t.options.selector,t.container)}t.container=(m=ue(e,document)).length?m[0]:null,t.destroy=function(){L.purge(),t.emit("destroyed"),x(!0)},t.prev=function(){t.moveToIdx(t.track.details.abs-1,!0)},t.next=function(){t.moveToIdx(t.track.details.abs+1,!0)},t.update=f,d(t.options)}}var Ie=function(e,n,t){try{return(function(i,s){var a,o={};return a={emit:function(m){o[m]&&o[m].forEach((function(x){x(a)}));var L=a.options&&a.options[m];L&&L(a)},moveToIdx:function(m,L,x){var l=a.track.idxToDist(m,L);if(l){var v=a.options.defaultAnimation;a.animator.start([{distance:l,duration:D(x||v,"duration",500),easing:D(x||v,"easing",(function(c){return 1+--c*c*c*c*c}))}])}},on:function(m,L,x){x===void 0&&(x=!1),o[m]||(o[m]=[]);var l=o[m].indexOf(L);l>-1?x&&delete o[m][l]:x||o[m].push(L)},options:i},(function(){if(a.track=Oe(a),a.animator=Fe(a),s)for(var m=0,L=s;m<L.length;m++)(0,L[m])(a);a.track.init(a.options.initial||0),a.emit("created")})(),a})(n,Me([qe(e,{drag:!0,mode:"snap",renderMode:"precision",rubberband:!0,selector:".keen-slider__slide"}),ze,Re,_e],t||[],!0))}catch(i){console.error(i)}};const Ce=Ie.default||Ie;let j=[],O=null,ee=null,P="tones",se=null,te=null,de=null,Z=typeof Audio<"u"?new Audio:null;const pe=new Map;function he(){if(!te){const e=window.AudioContext||window.webkitAudioContext;e&&(te=new e)}return te&&te.state==="suspended"&&te.resume().catch(()=>{}),te}function fe(){he(),!Z&&typeof Audio<"u"&&(Z=new Audio)}if(typeof window<"u"){const e=["touchstart","touchend","click","keydown"],n=()=>{fe()};e.forEach(t=>{window.addEventListener(t,n,{passive:!0})})}function Se(e,n){return new Promise((t,i)=>{try{const s=n.slice(0);let a=!1;const o=e.decodeAudioData(s,m=>{a||(a=!0,t(m))},m=>{a||(a=!0,i(m))});o&&typeof o.then=="function"&&o.then(m=>{a||(a=!0,t(m))},m=>{a||(a=!0,i(m))})}catch(s){i(s)}})}async function $e(e){if(!(!e||pe.has(e)))try{const n=he();if(!n)return;const t=await fetch(e);if(!t.ok)return;const i=await t.arrayBuffer(),s=await Se(n,i);s&&pe.set(e,s)}catch{}}let X=null,J=null,V=null,K=null;function De(e){const n={ā:"a",á:"a",ǎ:"a",à:"a",ē:"e",é:"e",ě:"e",è:"e",ī:"i",í:"i",ǐ:"i",ì:"i",ō:"o",ó:"o",ǒ:"o",ò:"o",ū:"u",ú:"u",ǔ:"u",ù:"u",ǖ:"ü",ǘ:"ü",ǚ:"ü",ǜ:"ü"};return e.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g,t=>n[t])}function Pe(e){const n=e.replace("uu","ü").replace("v","ü").replace("lue","lüe").replace("nue","nüe"),t={a:"āáǎà",e:"ēéěè",i:"īíǐì",o:"ōóǒò",u:"ūúǔù",v:"ǖǘǚǜ",ü:"ǖǘǚǜ"};if(!n.slice(-1).match(/\d/))return n;try{const i=parseInt(n.slice(-1)),s=n.slice(0,-1);if(i===0||i===5)return s;let a=-1;for(const o of["a","e","o"])if(s.includes(o)){a=s.indexOf(o);break}if(a===-1){for(let o=s.length-1;o>=0;o--)if("iuvü".includes(s[o])){a=o;break}}if(a!==-1){let o=s[a];if(o==="v"&&(o="ü"),o in t)return s.slice(0,a)+t[o][i-1]+s.slice(a+1)}}catch{return n}return n}function U(e){const n=document.getElementById("app");n&&(n.className=n.className.replace(/bg-canvas-\w+/g,""),n.classList.add(e))}function Ye(){const e=document.getElementById("menu-screen"),n=document.getElementById("game-screen"),t=document.getElementById("audio-library-screen"),i=document.getElementById("main-menu"),s=document.getElementById("submenu"),a=document.getElementById("start-tones-btn"),o=document.getElementById("open-submenu-btn"),m=document.getElementById("close-submenu-btn"),L=document.getElementById("open-library-btn"),x=document.getElementById("back-to-main-menu-btn"),l=document.getElementById("start-initials-btn"),v=document.getElementById("start-endings-btn"),c=document.getElementById("back-to-menu-btn"),r=document.getElementById("engine-screen"),d=document.getElementById("open-engine-btn"),b=document.getElementById("back-from-engine-btn");d&&d.addEventListener("click",()=>{e.classList.add("hidden"),i.classList.remove("hidden"),s.classList.add("hidden"),r&&r.classList.remove("hidden"),U("bg-canvas-ice")}),b&&b.addEventListener("click",()=>{r&&r.classList.add("hidden"),e.classList.remove("hidden"),i.classList.remove("hidden"),U("bg-canvas-acid")}),o.addEventListener("click",()=>{i.classList.add("hidden"),s.classList.remove("hidden"),s.classList.add("flex"),U("bg-canvas-lavender")}),m.addEventListener("click",()=>{s.classList.add("hidden"),s.classList.remove("flex"),i.classList.remove("hidden"),U("bg-canvas-acid")}),L.addEventListener("click",()=>{e.classList.add("hidden"),i.classList.remove("hidden"),s.classList.add("hidden"),t.classList.remove("hidden"),U("bg-canvas-navy"),setTimeout(()=>{V&&V.update(),K&&K.update()},60)}),x.addEventListener("click",()=>{t.classList.add("hidden"),e.classList.remove("hidden"),i.classList.remove("hidden"),U("bg-canvas-acid")}),a.addEventListener("click",()=>xe("tones")),l.addEventListener("click",()=>xe("initials")),v.addEventListener("click",()=>xe("endings")),c.addEventListener("click",()=>{n.classList.add("hidden"),e.classList.remove("hidden"),P==="initials"||P==="endings"?(i.classList.add("hidden"),s.classList.remove("hidden"),s.classList.add("flex"),U("bg-canvas-lavender")):(s.classList.add("hidden"),s.classList.remove("flex"),i.classList.remove("hidden"),U("bg-canvas-acid")),document.querySelector(".options").style.display="grid",document.getElementById("play-btn").style.transform="scale(1)",document.getElementById("feedback").innerHTML="[IDENTIFY THE CORRECT TONE CONTOUR]"})}function xe(e){fe(),P=e,document.getElementById("menu-screen").classList.add("hidden"),document.getElementById("game-screen").classList.remove("hidden");const n=document.getElementById("game-mode-badge");e==="tones"?(U("bg-canvas-mint"),n&&(n.textContent="DRILL // TONE TRAINER")):e==="initials"?(U("bg-canvas-butter"),n&&(n.textContent="DRILL // INITIALS (声母)")):e==="endings"&&(U("bg-canvas-pink"),n&&(n.textContent="DRILL // ENDINGS (韵母)")),me()}async function Ue(){try{const e=await fetch("/mandarin_tone_trainer/single_words.json");if(!e.ok)throw new Error("JSON not found in public folder");j=await e.json(),console.log("App Ready. Vocabulary loaded:",j.length),je(),setTimeout(()=>{document.querySelectorAll(".tone-btn").forEach(n=>n.classList.remove("pop-up"))},1e3)}catch(e){console.error("Initialization error:",e)}}async function re(e){fe();const n=typeof e=="string"&&e.trim().length>0?e.trim():O?`/mandarin_tone_trainer/${O.audio}`:null;if(!n)return;const t=he();if(t)try{t.state==="suspended"&&await t.resume();let i=pe.get(n);if(!i){const s=await fetch(n);if(s.ok){const a=await s.arrayBuffer();i=await Se(t,a),i&&pe.set(n,i)}}if(i){if(de){try{de.stop()}catch{}de=null}const s=t.createBufferSource();s.buffer=i,s.connect(t.destination),s.start(0),de=s;return}}catch(i){console.warn("Web Audio playback failed, trying HTMLAudio fallback:",i)}try{Z||(Z=new Audio),Z.pause(),Z.currentTime=0,Z.src=n;const i=Z.play();i&&typeof i.catch=="function"&&i.catch(s=>console.warn("Audio play prevented:",s))}catch(i){console.error("Audio failed:",i)}}function We(){document.querySelectorAll(".tone-btn").forEach((e,n)=>{e.addEventListener("click",t=>{fe();const i=e.querySelector(".option-text"),s=(i?i.textContent:e.textContent||"").trim().toLowerCase();let a=!1;if(P==="tones"){const o=(O.pinyin_correct||"").trim().toLowerCase();s===o&&(a=!0)}else if(P==="initials"){const o=(O.initial||"").trim().toLowerCase();(s===o||s==="∅"&&o==="")&&(a=!0)}else if(P==="endings"){const o=(O.ending_base||"").trim().toLowerCase();s===o&&(a=!0)}if(a){document.getElementById("feedback").innerHTML='<span class="bg-black text-canvas-acid px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider animate-bounce">CORRECT! +1</span>',document.querySelector(".options").style.display="none";const o=document.getElementById("fab-container");o.innerHTML=`
          <div class="w-14 h-14 rounded-2xl bg-canvas-acid text-black border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">check</span>
          </div>
        `,o.classList.remove("hidden"),document.getElementById("pinyin-display").innerHTML=`
            <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${O.hanzi}</div>
            <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${O.pinyin_correct}</div>
        `;const m=document.getElementById("explanation-box");let L="";if(P==="initials"||P==="endings"){const x=P==="initials"?O.initial||"∅":O.ending_base,l=P==="initials"?O.initial_explanation:O.final_explanation;L=`
                <div class="relative p-2 text-center">
                    <p class="font-mono text-xs sm:text-sm text-left text-black">
                        <strong class="font-speed font-black text-black">${x}:</strong> 
                        ${l}
                    </p>
                    <button id="next-question-btn" class="mt-3 px-5 py-2 rounded-full bg-black text-white hover:bg-badge-pink border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-hard-black flex items-center gap-2 mx-auto active-collapse transition-colors cursor-pointer">
                        <span>NEXT QUESTION</span>
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            `,m.innerHTML=L,m.classList.remove("hidden"),document.getElementById("next-question-btn").addEventListener("click",()=>me(),{once:!0})}else ee=j[Math.floor(Math.random()*j.length)],ee&&ee.audio&&$e(`/mandarin_tone_trainer/${ee.audio}`),se&&clearTimeout(se),se=setTimeout(me,1500)}else{document.getElementById("feedback").innerHTML='<span class="bg-badge-red text-white px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider">TRY AGAIN</span>';const o=document.getElementById("fab-container");o.innerHTML=`
          <div class="w-14 h-14 rounded-2xl bg-badge-red text-white border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">close</span>
          </div>
        `,o.classList.remove("hidden"),setTimeout(()=>{o.classList.add("hidden")},1e3),re()}})}),document.getElementById("play-btn").addEventListener("click",()=>re())}function me(){se&&(clearTimeout(se),se=null),document.querySelector(".options").style.display="grid";const e=document.getElementById("play-btn");e.style.transform="scale(1)",document.getElementById("fab-container").classList.add("hidden"),document.getElementById("explanation-box").classList.add("hidden"),ee?(O=ee,ee=null):O=j[Math.floor(Math.random()*j.length)];const n=document.getElementById("pinyin-display"),t=document.querySelectorAll(".tone-btn");if(P==="tones"){n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${O.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${O.pinyin_base}</div>
      `;const i=["High","Rising","Dipping","Falling"];t.forEach((s,a)=>{s.querySelector(".option-text").textContent=O.tone_options[a];const o=s.querySelector(".tone-hint");o&&(o.textContent=i[a])})}else P==="initials"?(n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${O.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          <span class="inline-block w-6 md:w-8 border-b-4 border-black mb-1"></span>${O.ending_correct}
        </div>
      `,t.forEach((i,s)=>{i.querySelector(".option-text").textContent=O.initial_options[s]===""?"∅":O.initial_options[s];const a=i.querySelector(".tone-hint");a&&(a.textContent="")})):P==="endings"&&(n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${O.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          ${O.initial}<span class="inline-block w-8 md:w-12 border-b-4 border-black mb-1"></span>
        </div>
      `,t.forEach((i,s)=>{i.querySelector(".option-text").textContent=De(O.ending_options[s]);const a=i.querySelector(".tone-hint");a&&(a.textContent="")}));t.forEach(i=>{i.offsetWidth}),document.getElementById("feedback").innerHTML='<span class="text-white/80">[IDENTIFY THE TARGET SOUND]</span>',re()}function Be(e){let n=!1;e.on("created",()=>{e.container.addEventListener("wheel",t=>{if(t.preventDefault(),n)return;const i=t.deltaY;Math.abs(i)<8||(n=!0,i>0?e.next():e.prev(),setTimeout(()=>{n=!1},90))},{passive:!1})})}function je(){const e=document.getElementById("initials-scroller"),n=document.getElementById("finals-scroller"),t=document.getElementById("library-tone-modal"),i=document.getElementById("modal-pinyin-display"),s=document.getElementById("close-modal-btn"),a=document.getElementById("library-selection-display"),o=document.getElementById("library-main-play-btn"),m=[...new Set(j.map(c=>c.initial))].sort(),L=[...new Set(j.map(c=>c.ending_base))].sort();e.innerHTML="",n.innerHTML="",m.forEach((c,r)=>{const d=document.createElement("div");d.className="keen-slider__slide flex items-center justify-center cursor-pointer select-none",d.dataset.index=r;const b=document.createElement("span");b.className="slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150",b.textContent=c===""?"∅":c,d.appendChild(b),e.appendChild(d)}),L.forEach((c,r)=>{const d=document.createElement("div");d.className="keen-slider__slide flex items-center justify-center cursor-pointer select-none",d.dataset.index=r;const b=document.createElement("span");b.className="slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150",b.textContent=c,d.appendChild(b),n.appendChild(d)});function x(c,r){if(!c.track||!c.track.details)return;const d=c.track.details,b=c.container.querySelectorAll(".slide-label");d.slides.forEach((I,f)=>{const p=b[f];if(!p)return;const g=Math.abs(I.distance);g<.5?(p.style.opacity="1",p.style.transform=`scale(${1.2-g*.15})`,p.style.color=r==="initial"?"#000000":"#104FE2",p.style.fontWeight="900"):g<1.5?(p.style.opacity="0.6",p.style.transform="scale(0.95)",p.style.color="#000000",p.style.fontWeight="700"):g<2.5?(p.style.opacity="0.35",p.style.transform="scale(0.85)",p.style.color="#000000",p.style.fontWeight="600"):(p.style.opacity="0.15",p.style.transform="scale(0.75)",p.style.color="#000000",p.style.fontWeight="500")})}function l(){if(!V||!K||!V.track||!K.track||!V.track.details||!K.track.details)return;const c=V.track.details.rel,r=K.track.details.rel;X=m[c],J=L[r];const d=X==="∅"?"":X,b=d+J,I=j.filter(f=>f.initial===d&&f.ending_base===J);I.length>0?(a.innerHTML=`
                <span class="font-chinese font-black text-2xl sm:text-3xl text-black">${b}</span>
                <span class="ml-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-bold bg-black text-canvas-acid px-2 py-0.5 rounded border border-black shadow-sm">
                  ${I.length} TONE${I.length>1?"S":""}
                </span>
            `,o.disabled=!1):(a.innerHTML=`
                <span class="font-chinese text-2xl font-bold text-black/30 line-through">${b}</span>
                <span class="ml-2 font-mono text-xs uppercase tracking-wider text-badge-red font-black">(No syllable)</span>
            `,o.disabled=!0)}V=new Ce(e,{vertical:!0,mode:"free-snap",rubberband:!0,slides:{origin:"center",perView:7,spacing:0},initial:0,created(c){x(c,"initial")},detailsChanged(c){x(c,"initial")},slideChanged(){l()}},[Be]),K=new Ce(n,{vertical:!0,mode:"free-snap",rubberband:!0,slides:{origin:"center",perView:7,spacing:0},initial:0,created(c){x(c,"final")},detailsChanged(c){x(c,"final")},slideChanged(){l()}},[Be]),e.addEventListener("click",c=>{const r=c.target.closest(".keen-slider__slide");if(r&&V){const d=parseInt(r.dataset.index);V.moveToIdx(d,!0,{duration:250})}}),n.addEventListener("click",c=>{const r=c.target.closest(".keen-slider__slide");if(r&&K){const d=parseInt(r.dataset.index);K.moveToIdx(d,!0,{duration:250})}});function v(){(!X||!J)&&l();const c=X==="∅"?"":X,r=c+J;i.textContent=r,t.querySelectorAll(".tone-select-btn").forEach((b,I)=>{const f=I+1,p=Pe(`${r}${f}`);b.textContent=p,j.find(S=>S.initial===c&&S.ending_base===J&&S.tone===f)?(b.disabled=!1,b.classList.remove("opacity-30","cursor-not-allowed","pointer-events-none"),b.classList.add("hover:bg-white","cursor-pointer")):(b.disabled=!0,b.classList.add("opacity-30","cursor-not-allowed","pointer-events-none"),b.classList.remove("hover:bg-white","cursor-pointer"))}),t.classList.remove("hidden")}o.addEventListener("click",v),s.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",c=>{const r=c.target.closest(".tone-select-btn");if(r&&!r.disabled){const d=parseInt(r.dataset.tone),b=X==="∅"?"":X,I=j.find(f=>f.initial===b&&f.ending_base===J&&f.tone===d);if(I){const f=`/mandarin_tone_trainer/${I.audio}`;re(f)}else console.warn(`No audio found for ${b}${J}${d}`)}}),setTimeout(l,50)}window.addEventListener("keydown",e=>{const n=document.getElementById("game-screen"),t=document.getElementById("engine-screen");if(n&&!n.classList.contains("hidden"))if(e.key>="1"&&e.key<="4"){const i=parseInt(e.key)-1,s=document.querySelectorAll(".tone-btn")[i];s&&document.querySelector(".options").style.display!=="none"&&s.click()}else e.code==="Space"&&(e.preventDefault(),re());else if(t&&!t.classList.contains("hidden")&&e.code==="Space"){e.preventDefault();const i=document.getElementById("engine-record-btn");i&&i.click()}});function Ge(){const e=document.getElementById("engine-record-btn"),n=document.getElementById("engine-next-btn"),t=document.getElementById("engine-reset-btn"),i=document.getElementById("coach-hear-user-btn"),s=document.getElementById("engine-step-counter"),a=[{syllablesCount:2,hanzi:"你 好",pinyin:"nǐ hǎo",gloss:"Hello",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ní hǎo"},{syllablesCount:1,hanzi:"妈",pinyin:"mā",gloss:"Mother",sandhi:"/ Tone 1: High Level 55 /",spoken:"mā"},{syllablesCount:3,hanzi:"对 不 起",pinyin:"duì bu qǐ",gloss:"Sorry",sandhi:"/ 4th + Neutral + 3rd /",spoken:"duì bu qǐ"},{syllablesCount:2,hanzi:"可 以",pinyin:"kě yǐ",gloss:"Can / May",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ké yǐ"},{syllablesCount:1,hanzi:"好",pinyin:"hǎo",gloss:"Good",sandhi:"/ Tone 3: Low-Dipping 214 /",spoken:"hǎo"},{syllablesCount:3,hanzi:"冰 淇 淋",pinyin:"bīng qí lín",gloss:"Ice Cream",sandhi:"/ 1st + 2nd + 2nd /",spoken:"bīng qí lín"},{syllablesCount:2,hanzi:"水 果",pinyin:"shuǐ guǒ",gloss:"Fruit",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"shuí guǒ"},{syllablesCount:3,hanzi:"没 关 系",pinyin:"méi guān xi",gloss:"It's Okay",sandhi:"/ 2nd + 1st + Neutral /",spoken:"méi guān xi"},{syllablesCount:1,hanzi:"马",pinyin:"mǎ",gloss:"Horse",sandhi:"/ Tone 3: Low-Dipping 214 /",spoken:"mǎ"},{syllablesCount:2,hanzi:"手 表",pinyin:"shǒu biǎo",gloss:"Watch",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"shóu biǎo"}];let o=!1,m=0;function L(l,v){document.querySelectorAll("#engine-syllable-toggle-group button").forEach((T,w)=>{w+1===l?T.className="px-2 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer":T.className="px-2 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer"});let r=v;r||(l===1?r={syllablesCount:1,hanzi:"妈",pinyin:"mā",gloss:"Mother",sandhi:"/ Tone 1: High Level 55 /",spoken:"mā"}:l===3?r={syllablesCount:3,hanzi:"对 不 起",pinyin:"duì bu qǐ",gloss:"Sorry",sandhi:"/ 4th + Neutral + 3rd /",spoken:"duì bu qǐ"}:r={syllablesCount:2,hanzi:"你 好",pinyin:"nǐ hǎo",gloss:"Hello",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ní hǎo"});const d=document.getElementById("engine-hanzi-display"),b=document.getElementById("engine-pinyin-display"),I=document.getElementById("engine-gloss-display"),f=document.getElementById("engine-stage-label"),p=document.getElementById("engine-sandhi-badge"),g=document.getElementById("engine-arena-subtitle");d&&(d.textContent=r.hanzi),b&&(b.textContent=r.pinyin),I&&(I.textContent=`"${r.gloss}"`),l===1?(f&&(f.textContent="[STAGE 1: ISOLATED SYLLABLE]"),g&&(g.textContent="CHAO 5-LEVEL SINGLE-CONTOUR"),p&&(p.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Isolated Tone Profile</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${r.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${r.spoken}</span>
        `)):l===3?(f&&(f.textContent="[STAGE 3: 3-SYLLABLE & NEUTRAL TONE]"),g&&(g.textContent="CHAO 5-LEVEL TRIPLE-CONTOUR"),p&&(p.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Compound Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${r.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${r.spoken}</span>
        `)):(f&&(f.textContent="[STAGE 2: TONE SANDHI]"),g&&(g.textContent="CHAO 5-LEVEL DUAL-CONTOUR"),p&&(p.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Sandhi Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${r.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${r.spoken}</span>
        `));const S=document.getElementById("pitch-chart-wrapper"),M=document.getElementById("pitch-chart-svg"),A=document.getElementById("pitch-grid-levels"),h=document.getElementById("pitch-syllable-dividers"),C=document.getElementById("pitch-target-ribbons"),N=document.getElementById("user-pitch-paths-container"),R=document.getElementById("user-pitch-points-container"),z=document.getElementById("engine-live-waveform-group"),_=document.getElementById("pitch-time-milestones"),E=document.getElementById("pitch-timeline-fill"),y=document.getElementById("pitch-timeline-text");if(l===1){S&&(S.className="flex gap-1.5 items-center justify-center max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] mx-auto my-auto transition-all duration-300"),M&&M.setAttribute("viewBox","0 0 350 155"),A&&(A.innerHTML=`
          <line x1="15" y1="15" x2="335" y2="15" />
          <line x1="15" y1="46" x2="335" y2="46" />
          <line x1="15" y1="78" x2="335" y2="78" />
          <line x1="15" y1="110" x2="335" y2="110" />
          <line x1="15" y1="140" x2="335" y2="140" />
        `),h&&(h.innerHTML="");const T=r.sandhi&&r.sandhi.includes("Dipping");C&&(T?C.innerHTML=`
            <polygon id="target-ribbon-s1" points="40,105 160,146 310,48 310,30 160,126 40,85" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `:C.innerHTML=`
            <polygon id="target-ribbon-s1" points="40,22 310,22 310,8 40,8" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(T?N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 40,95 Q 160,142 310,40" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `:N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 40,15 Q 175,13 310,15" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),R&&(T?R.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="100" cy="118" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="160" cy="142" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="235" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="40" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `:R.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="15" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="95" cy="14" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="150" cy="13" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="205" cy="13" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="260" cy="14" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="15" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `),z&&(z.innerHTML=`
          <path d="M 30,80 Q 70,50 110,80 T 190,80 T 270,80 T 320,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="175" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `),_&&(_.innerHTML=`
          <text x="40" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
          <text x="175" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[${r.pinyin}] ~320ms</text>
          <text x="310" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
        `),E&&(E.style.width="55%"),y&&(y.textContent="0.18s / 0.32s")}else S&&(S.className="flex gap-1.5 items-center justify-center w-full my-auto transition-all duration-300"),M&&M.setAttribute("viewBox","0 0 660 155"),A&&(A.innerHTML=`
          <line x1="20" y1="15" x2="640" y2="15" />
          <line x1="20" y1="46" x2="640" y2="46" />
          <line x1="20" y1="78" x2="640" y2="78" />
          <line x1="20" y1="110" x2="640" y2="110" />
          <line x1="20" y1="140" x2="640" y2="140" />
        `),z&&(z.innerHTML=`
          <path d="M 50,80 Q 90,50 130,80 T 210,80 T 290,80 T 370,80 T 450,80 T 530,80 T 610,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="330" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `),l===3?(h&&(h.innerHTML=`
            <line x1="225" y1="8" x2="225" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="231" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 2 [bu] ➔</text>
            <line x1="435" y1="8" x2="435" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="441" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 3 [qǐ] ➔</text>
          `),C&&(C.innerHTML=`
            <polygon id="target-ribbon-s1" points="35,16 195,135 195,115 35,6" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="245,95 405,102 405,86 245,80" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s3" points="455,98 535,146 625,56 625,38 535,126 455,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 35,18 Q 115,70 195,126" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 245,90 Q 325,92 405,96" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s3" d="M 455,92 Q 535,142 625,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),R&&(R.innerHTML=`
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
          `),_&&(_.innerHTML=`
            <text x="35" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="115" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[duì]</text>
            <text x="195" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.28s</text>
            <text x="245" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.30s</text>
            <text x="325" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[bu]</text>
            <text x="405" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.46s</text>
            <text x="455" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.48s</text>
            <text x="540" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[qǐ]</text>
            <text x="625" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.85s</text>
          `),E&&(E.style.width="55%"),y&&(y.textContent="0.46s / 0.85s")):(h&&(h.innerHTML=`
            <line x1="330" y1="8" x2="330" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="336" y="20" class="font-mono text-[9px] fill-black/60 font-black">SYLLABLE 2 [hǎo] ➔</text>
          `),C&&(C.innerHTML=`
            <polygon id="target-ribbon-s1" points="70,95 300,28 300,10 70,75" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="360,98 470,146 600,52 600,32 470,126 360,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 70,85 Q 180,54 300,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 360,88 Q 465,138 600,45" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),R&&(R.innerHTML=`
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
          `),_&&(_.innerHTML=`
            <text x="70" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="180" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: n] [Final: í]</text>
            <text x="300" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
            <text x="360" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.34s</text>
            <text x="480" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: h] [Final: ǎo]</text>
            <text x="600" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.72s</text>
          `),E&&(E.style.width="45%"),y&&(y.textContent="0.32s / 0.72s"));const k=document.getElementById("phonetic-audit-grid");k&&(l===1?(k.className="grid grid-cols-1 max-w-sm sm:max-w-md mx-auto gap-2",k.innerHTML=`
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 1: [${r.pinyin}]</span>
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
        `):l===3?(k.className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2",k.innerHTML=`
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
        `):(k.className="grid grid-cols-1 sm:grid-cols-2 gap-2",k.innerHTML=`
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
        `));const u=document.getElementById("coach-advice-text");u&&(l===1?u.innerHTML='"Laser-flat pitch! Keep your voice steady at <strong class="bg-black text-white px-1.5 py-0.5 rounded">Level 5 (55)</strong> without letting it drift down at the end."':l===3?u.innerHTML=`"On the neutral tone <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'bu'</strong>, keep it ultra-brief (~100ms) and light. Do not stress or lengthen it—it should bounce smoothly into <em class="text-badge-cobalt font-black">'qǐ'</em>."`:u.innerHTML=`"You flattened out too early on <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'ní'</strong>. Keep your pitch climbing all the way to the top, like asking a surprised question: <em class="text-badge-cobalt font-black">'Really?!'</em>"`)}function x(l){m=Math.max(0,Math.min(l,a.length-1));const v=a[m];v&&L(v.syllablesCount,v),s&&(s.textContent=`STEP ${m+1} / ${a.length}`)}n&&n.addEventListener("click",()=>{const l=(m+1)%a.length;x(l)}),t&&t.addEventListener("click",()=>{x(0),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(1)}),i&&i.addEventListener("click",()=>{const l=i.innerHTML;i.innerHTML='<span class="material-symbols-outlined text-sm animate-spin">sync</span> PLAYING USER TRACK...',i.classList.add("bg-badge-tangerine","text-white"),setTimeout(()=>{i.innerHTML=l,i.classList.remove("bg-badge-tangerine","text-white")},1200)}),e&&e.addEventListener("click",()=>{o=!o;const l=e.querySelector("span:nth-child(2)"),v=e.querySelector("span:nth-child(1)");o?(e.classList.replace("bg-badge-tangerine","bg-black"),e.classList.add("text-badge-tangerine"),e.classList.remove("text-white"),l&&(l.textContent="LISTENING... (TAP TO STOP)"),v&&v.classList.add("bg-badge-tangerine","scale-125")):(e.classList.replace("bg-black","bg-badge-tangerine"),e.classList.remove("text-badge-tangerine"),e.classList.add("text-white"),l&&(l.textContent="TAP TO RETRY"),v&&v.classList.remove("bg-badge-tangerine","scale-125"))}),window.PronunciationEngine={setRevealState(l){const v=document.getElementById("user-voice-track-group"),c=document.getElementById("engine-live-waveform-group"),r=document.getElementById("phonetic-audit-section"),d=document.getElementById("articulatory-coach-card");document.querySelectorAll("#engine-state-toggle-group button").forEach((I,f)=>{(f===0?1:f===1?2:4)===l?I.className="px-1.5 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer":I.className="px-1.5 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer"}),l===1?(v&&v.classList.add("hidden"),c&&c.classList.add("hidden"),r&&r.classList.add("hidden"),d&&d.classList.add("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TAP TO RECORD</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `)):l===2?(v&&v.classList.add("hidden"),c&&c.classList.remove("hidden"),r&&r.classList.add("hidden"),d&&d.classList.add("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-black text-badge-tangerine border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-badge-tangerine animate-ping border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">RECORDING...</span>
            <span class="font-mono text-[10px] bg-badge-tangerine text-black px-1.5 py-0.5 rounded hidden sm:inline">[STOP]</span>
          `)):(v&&v.classList.remove("hidden"),c&&c.classList.add("hidden"),r&&r.classList.remove("hidden"),d&&d.classList.remove("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TAP TO RETRY</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `))},setSyllableCount(l,v){L(l,v)},setTargetWord(l){l.syllablesCount?L(l.syllablesCount,l):(l.hanzi&&(document.getElementById("engine-hanzi-display").textContent=l.hanzi),l.pinyin&&(document.getElementById("engine-pinyin-display").textContent=l.pinyin),l.gloss&&(document.getElementById("engine-gloss-display").textContent=`"${l.gloss}"`))},selectWordIndex(l){x(l)},updateUserCurves({pathS1:l,pathS2:v,pathS3:c}){if(l){const r=document.getElementById("user-pitch-path-s1");r&&r.setAttribute("d",l)}if(v){const r=document.getElementById("user-pitch-path-s2");r&&r.setAttribute("d",v)}if(c){const r=document.getElementById("user-pitch-path-s3");r&&r.setAttribute("d",c)}},updateTargetRibbons({pointsS1:l,pointsS2:v,pointsS3:c}){if(l){const r=document.getElementById("target-ribbon-s1");r&&r.setAttribute("points",l)}if(v){const r=document.getElementById("target-ribbon-s2");r&&r.setAttribute("points",v)}if(c){const r=document.getElementById("target-ribbon-s3");r&&r.setAttribute("points",c)}},setCoachingAdvice(l){const v=document.getElementById("coach-advice-text");v&&(v.innerHTML=l)}}}We();Ye();Ge();Ue();
