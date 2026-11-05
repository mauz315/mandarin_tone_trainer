(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const l of s)if(l.type==="childList")for(const i of l.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function t(s){const l={};return s.integrity&&(l.integrity=s.integrity),s.referrerPolicy&&(l.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?l.credentials="include":s.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function a(s){if(s.ep)return;s.ep=!0;const l=t(s);fetch(s.href,l)}})();var te=function(){return te=Object.assign||function(e){for(var n,t=1,a=arguments.length;t<a;t++)for(var s in n=arguments[t])Object.prototype.hasOwnProperty.call(n,s)&&(e[s]=n[s]);return e},te.apply(this,arguments)};function Te(e,n,t){for(var a,s=0,l=n.length;s<l;s++)!a&&s in n||(a||(a=Array.prototype.slice.call(n,0,s)),a[s]=n[s]);return e.concat(a||Array.prototype.slice.call(n))}function ge(e){return Array.prototype.slice.call(e)}function he(e,n){var t=Math.floor(e);return t===n||t+1===n?e:n}function ke(){return Date.now()}function de(e,n,t){if(n="data-keen-slider-"+n,t===null)return e.removeAttribute(n);e.setAttribute(n,t||"")}function ce(e,n){return n=n||document,typeof e=="function"&&(e=e(n)),Array.isArray(e)?e:typeof e=="string"?ge(n.querySelectorAll(e)):e instanceof HTMLElement?[e]:e instanceof NodeList?ge(e):[]}function se(e){e.raw&&(e=e.raw),e.cancelable&&!e.defaultPrevented&&e.preventDefault()}function ae(e){e.raw&&(e=e.raw),e.stopPropagation&&e.stopPropagation()}function Ie(){var e=[];return{add:function(n,t,a,s){n.addListener?n.addListener(a):n.addEventListener(t,a,s),e.push([n,t,a,s])},input:function(n,t,a,s){this.add(n,t,(function(l){return function(i){i.nativeEvent&&(i=i.nativeEvent);var v=i.changedTouches||[],L=i.targetTouches||[],x=i.detail&&i.detail.x?i.detail:null;return l({id:x?x.identifier?x.identifier:"i":L[0]?L[0]?L[0].identifier:"e":"d",idChanged:x?x.identifier?x.identifier:"i":v[0]?v[0]?v[0].identifier:"e":"d",raw:i,x:x&&x.x?x.x:L[0]?L[0].screenX:x?x.x:i.pageX,y:x&&x.y?x.y:L[0]?L[0].screenY:x?x.y:i.pageY})}})(a),s)},purge:function(){e.forEach((function(n){n[0].removeListener?n[0].removeListener(n[2]):n[0].removeEventListener(n[1],n[2],n[3])})),e=[]}}}function fe(e,n,t){return Math.min(Math.max(e,n),t)}function G(e){return(e>0?1:0)-(e<0?1:0)||+e}function ye(e){var n=e.getBoundingClientRect();return{height:he(n.height,e.offsetHeight),width:he(n.width,e.offsetWidth)}}function D(e,n,t,a){var s=e&&e[n];return s==null?t:a&&typeof s=="function"?s():s}function Y(e){return Math.round(1e6*e)/1e6}function Me(e){var n,t,a,s,l,i;function v(c){i||(i=c),L(!0);var o=c-i;o>a&&(o=a);var d=s[t];if(d[3]<o)return t++,v(c);var b=d[2],I=d[4],f=d[0],p=d[1]*(0,d[5])(I===0?1:(o-b)/I);if(p&&e.track.to(f+p),o<a)return r();i=null,L(!1),x(null),e.emit("animationEnded")}function L(c){n.active=c}function x(c){n.targetIdx=c}function r(){var c;c=v,l=window.requestAnimationFrame(c)}function y(){var c;c=l,window.cancelAnimationFrame(c),L(!1),x(null),i&&e.emit("animationStopped"),i=null}return n={active:!1,start:function(c){if(y(),e.track.details){var o=0,d=e.track.details.position;t=0,a=0,s=c.map((function(b){var I,f=Number(d),p=(I=b.earlyExit)!==null&&I!==void 0?I:b.duration,m=b.easing,S=b.distance*m(p/b.duration)||0;d+=S;var M=a;return a+=p,o+=S,[f,b.distance,M,a,b.duration,m]})),x(e.track.distToIdx(o)),r(),e.emit("animationStarted")}},stop:y,targetIdx:null}}function Ae(e){var n,t,a,s,l,i,v,L,x,r,y,c,o,d,b=1/0,I=[],f=null,p=0;function m(k){O(p+k)}function S(k){var h=M(p+k).abs;return B(h)?h:null}function M(k){var h=Math.floor(Math.abs(Y(k/t))),u=Y((k%t+t)%t);u===t&&(u=0);var T=G(k),w=v.indexOf(Te([],v).reduce((function(H,F){return Math.abs(F-u)<Math.abs(H-u)?F:H}))),C=w;return T<0&&h++,w===i&&(C=0,h+=T>0?1:-1),{abs:C+h*i*T,origin:w,rel:C}}function A(k,h,u){var T;if(h||!_())return g(k,u);if(!B(k))return null;var w=M(u??p),C=w.abs,H=k-w.rel,F=C+H;T=g(F);var q=g(F-i*G(H));return(q!==null&&Math.abs(q)<Math.abs(T)||T===null)&&(T=q),Y(T)}function g(k,h){if(h==null&&(h=Y(p)),!B(k)||k===null)return null;k=Math.round(k);var u=M(h),T=u.abs,w=u.rel,C=u.origin,H=z(k),F=(h%t+t)%t,q=v[C],Q=Math.floor((k-(T-w))/i)*t;return Y(q-F-q+v[H]+Q+(C===i?t:0))}function B(k){return N(k)===k}function N(k){return fe(k,x,r)}function _(){return s.loop}function z(k){return(k%i+i)%i}function O(k){var h;h=k-p,I.push({distance:h,timestamp:ke()}),I.length>6&&(I=I.slice(-6)),p=Y(k);var u=E().abs;if(u!==f){var T=f!==null;f=u,T&&e.emit("slideChanged")}}function E(k){var h=k?null:(function(){if(i){var u=_(),T=u?(p%t+t)%t:p,w=(u?p%t:p)-l[0][2],C=0-(w<0&&u?t-Math.abs(w):w),H=0,F=M(p),q=F.abs,Q=F.rel,le=l[Q][2],re=l.map((function(V,Be){var $=C+H;($<0-V[0]||$>1)&&($+=(Math.abs($)>t-1&&u?t:0)*G(-$));var be=Be-Q,xe=G(be),ne=be+q;u&&(xe===-1&&$>le&&(ne+=i),xe===1&&$<le&&(ne-=i),y!==null&&ne<y&&($+=t),c!==null&&ne>c&&($-=t));var me=$+V[0]+V[1],Ce=Math.max($>=0&&me<=1?1:me<0||$>1?0:$<0?Math.min(1,(V[0]+$)/V[0]):(1-$)/V[0],0);return H+=V[0]+V[1],{abs:ne,distance:s.rtl?-1*$+1-V[0]:$,portion:Ce,size:V[0]}}));return q=N(q),Q=z(q),{abs:N(q),length:a,max:d,maxIdx:r,min:o,minIdx:x,position:p,progress:u?T/t:p/a,rel:Q,slides:re,slidesLength:t}}})();return n.details=h,e.emit("detailsChanged"),h}return n={absToRel:z,add:m,details:null,distToIdx:S,idxToDist:A,init:function(k){if((function(){if(s=e.options,l=(s.trackConfig||[]).map((function(w){return[D(w,"size",1),D(w,"spacing",0),D(w,"origin",0)]})),i=l.length){t=Y(l.reduce((function(w,C){return w+C[0]+C[1]}),0));var u,T=i-1;a=Y(t+l[0][2]-l[T][0]-l[T][2]-l[T][1]),v=l.reduce((function(w,C){if(!w)return[0];var H=l[w.length-1],F=w[w.length-1]+(H[0]+H[2])+H[1];return F-=C[2],w[w.length-1]>F&&(F=w[w.length-1]),F=Y(F),w.push(F),(!u||u<F)&&(L=w.length-1),u=F,w}),null),a===0&&(L=0),v.push(Y(t))}})(),!i)return E(!0);var h;(function(){var u=e.options.range,T=e.options.loop;y=x=T?D(T,"min",-1/0):0,c=r=T?D(T,"max",b):L;var w=D(u,"min",null),C=D(u,"max",null);w!==null&&(x=w),C!==null&&(r=C),o=x===-1/0?x:e.track.idxToDist(x||0,!0,0),d=r===b?r:A(r,!0,0),C===null&&(c=r),D(u,"align",!1)&&r!==b&&l[z(r)][2]===0&&(d-=1-l[z(r)][0],r=S(d-p)),o=Y(o),d=Y(d)})(),h=k,Number(h)===h?m(g(N(k))):E()},to:O,velocity:function(){var k=ke(),h=I.reduce((function(u,T){var w=T.distance,C=T.timestamp;return k-C>200||(G(w)!==G(u.distance)&&u.distance&&(u={distance:0,lastTimestamp:0,time:0}),u.time&&(u.distance+=w),u.lastTimestamp&&(u.time+=C-u.lastTimestamp),u.lastTimestamp=C),u}),{distance:0,lastTimestamp:0,time:0});return h.distance/h.time||0}}}function Se(e){var n,t,a,s,l,i,v,L;function x(f){return 2*f}function r(f){return fe(f,v,L)}function y(f){return 1-Math.pow(1-f,3)}function c(){return a?e.track.velocity():0}function o(){I();var f=e.options.mode==="free-snap",p=e.track,m=c();s=G(m);var S=e.track.details,M=[];if(m||!f){var A=d(m),g=A.dist,B=A.dur;if(B=x(B),g*=s,f){var N=p.idxToDist(p.distToIdx(g),!0);N&&(g=N)}M.push({distance:g,duration:B,easing:y});var _=S.position,z=_+g;if(z<l||z>i){var O=z<l?l-_:i-_,E=0,k=m;if(G(O)===s){var h=Math.min(Math.abs(O)/Math.abs(g),1),u=(function(C){return 1-Math.pow(1-C,1/3)})(h)*B;M[0].earlyExit=u,k=m*(1-h)}else M[0].earlyExit=0,E+=O;var T=d(k,100),w=T.dist*s;e.options.rubberband&&(M.push({distance:w,duration:x(T.dur),easing:y}),M.push({distance:-w+E,duration:500,easing:y}))}e.animator.start(M)}else e.moveToIdx(r(S.abs),!0,{duration:500,easing:function(C){return 1+--C*C*C*C*C}})}function d(f,p){p===void 0&&(p=1e3);var m=147e-9+(f=Math.abs(f))/p;return{dist:Math.pow(f,2)/m,dur:f/m}}function b(){var f=e.track.details;f&&(l=f.min,i=f.max,v=f.minIdx,L=f.maxIdx)}function I(){e.animator.stop()}e.on("updated",b),e.on("optionsChanged",b),e.on("created",b),e.on("dragStarted",(function(){a=!1,I(),n=t=e.track.details.abs})),e.on("dragChecked",(function(){a=!0})),e.on("dragEnded",(function(){var f=e.options.mode;f==="snap"&&(function(){var p=e.track,m=e.track.details,S=m.position,M=G(c());(S>i||S<l)&&(M=0);var A=n+M;m.slides[p.absToRel(A)].portion===0&&(A-=M),n!==t&&(A=t),G(p.idxToDist(A,!0))!==M&&(A+=M),A=r(A);var g=p.idxToDist(A,!0);e.animator.start([{distance:g,duration:500,easing:function(B){return 1+--B*B*B*B*B}}])})(),f!=="free"&&f!=="free-snap"||o()})),e.on("dragged",(function(){t=e.track.details.abs}))}function Ne(e){var n,t,a,s,l,i,v,L,x,r,y,c,o,d,b,I,f,p,m=Ie();function S(E){if(i&&L===E.id){var k=B(E);if(x){if(!g(E))return A(E);r=k,x=!1,e.emit("dragChecked")}if(I)return r=k;se(E);var h=(function(T){if(f===-1/0&&p===1/0)return T;var w=e.track.details,C=w.length,H=w.position,F=fe(T,f-H,p-H);if(C===0)return 0;if(!e.options.rubberband)return F;if(H<=p&&H>=f||H<f&&t>0||H>p&&t<0)return T;var q=(H<f?H-f:H-p)/C,Q=s*C,le=Math.abs(q*Q),re=Math.max(0,1-le/l*2);return re*re*T})(v(r-k)/s*a);t=G(h);var u=e.track.details.position;(u>f&&u<p||u===f&&t>0||u===p&&t<0)&&ae(E),y+=h,!c&&Math.abs(y*s)>5&&(c=!0),e.track.add(h),r=k,e.emit("dragged")}}function M(E){!i&&e.track.details&&e.track.details.length&&(y=0,i=!0,c=!1,x=!0,L=E.id,g(E),r=B(E),e.emit("dragStarted"))}function A(E){i&&L===E.idChanged&&(i=!1,e.emit("dragEnded"))}function g(E){var k=N(),h=k?E.y:E.x,u=k?E.x:E.y,T=o!==void 0&&d!==void 0&&Math.abs(d-u)<=Math.abs(o-h);return o=h,d=u,T}function B(E){return N()?E.y:E.x}function N(){return e.options.vertical}function _(){s=e.size,l=N()?window.innerHeight:window.innerWidth;var E=e.track.details;E&&(f=E.min,p=E.max)}function z(E){c&&(ae(E),se(E))}function O(){if(m.purge(),e.options.drag&&!e.options.disabled){var E;E=e.options.dragSpeed||1,v=typeof E=="function"?E:function(h){return h*E},a=e.options.rtl?-1:1,_(),n=e.container,(function(){var h="data-keen-slider-clickable";ce("[".concat(h,"]:not([").concat(h,"=false])"),n).map((function(u){m.add(u,"dragstart",ae),m.add(u,"mousedown",ae),m.add(u,"touchstart",ae)}))})(),m.add(n,"dragstart",(function(h){se(h)})),m.add(n,"click",z,{capture:!0}),m.input(n,"ksDragStart",M),m.input(n,"ksDrag",S),m.input(n,"ksDragEnd",A),m.input(n,"mousedown",M),m.input(n,"mousemove",S),m.input(n,"mouseleave",A),m.input(n,"mouseup",A),m.input(n,"touchstart",M,{passive:!0}),m.input(n,"touchmove",S,{passive:!1}),m.input(n,"touchend",A),m.input(n,"touchcancel",A),m.add(window,"wheel",(function(h){i&&se(h)}));var k="data-keen-slider-scrollable";ce("[".concat(k,"]:not([").concat(k,"=false])"),e.container).map((function(h){return(function(u){var T;m.input(u,"touchstart",(function(w){T=B(w),I=!0,b=!0}),{passive:!0}),m.input(u,"touchmove",(function(w){var C=N(),H=C?u.scrollHeight-u.clientHeight:u.scrollWidth-u.clientWidth,F=T-B(w),q=C?u.scrollTop:u.scrollLeft,Q=C&&u.style.overflowY==="scroll"||!C&&u.style.overflowX==="scroll";if(T=B(w),(F<0&&q>0||F>0&&q<H)&&b&&Q)return I=!0;b=!1,se(w),I=!1})),m.input(u,"touchend",(function(){I=!1}))})(h)}))}}e.on("updated",_),e.on("optionsChanged",O),e.on("created",O),e.on("destroyed",m.purge)}function He(e){var n,t,a=null;function s(o,d,b){e.animator.active?i(o,d,b):requestAnimationFrame((function(){return i(o,d,b)}))}function l(){s(!1,!1,t)}function i(o,d,b){var I=0,f=e.size,p=e.track.details;if(p&&n){var m=p.slides;n.forEach((function(S,M){if(o)!a&&d&&L(S,null,b),x(S,null,b);else{if(!m[M])return;var A=m[M].size*f;!a&&d&&L(S,A,b),x(S,m[M].distance*f-I,b),I+=A}}))}}function v(o){return e.options.renderMode==="performance"?Math.round(o):o}function L(o,d,b){var I=b?"height":"width";d!==null&&(d=v(d)+"px"),o.style["min-"+I]=d,o.style["max-"+I]=d}function x(o,d,b){if(d!==null){d=v(d);var I=b?d:0;d="translate3d(".concat(b?0:d,"px, ").concat(I,"px, 0)")}o.style.transform=d,o.style["-webkit-transform"]=d}function r(){n&&(i(!0,!0,t),n=null),e.on("detailsChanged",l,!0)}function y(){s(!1,!0,t)}function c(){r(),t=e.options.vertical,e.options.disabled||e.options.renderMode==="custom"||(a=D(e.options.slides,"perView",null)==="auto",e.on("detailsChanged",l),(n=e.slides).length&&y())}e.on("created",c),e.on("optionsChanged",c),e.on("beforeOptionsChanged",(function(){r()})),e.on("updated",y),e.on("destroyed",r)}function Fe(e,n){return function(t){var a,s,l,i,v,L=Ie();function x(g){var B;de(t.container,"reverse",(B=t.container,window.getComputedStyle(B,null).getPropertyValue("direction")!=="rtl"||g?null:"")),de(t.container,"v",t.options.vertical&&!g?"":null),de(t.container,"disabled",t.options.disabled&&!g?"":null)}function r(){y()&&I()}function y(){var g=null;if(i.forEach((function(N){N.matches&&(g=N.__media)})),g===a)return!1;a||t.emit("beforeOptionsChanged"),a=g;var B=g?l.breakpoints[g]:l;return t.options=te(te({},l),B),x(),M(),A(),p(),!0}function c(g){var B=ye(g);return(t.options.vertical?B.height:B.width)/t.size||1}function o(){return t.options.trackConfig.length}function d(g){for(var B in a=!1,l=te(te({},n),g),L.purge(),s=t.size,i=[],l.breakpoints||[]){var N=window.matchMedia(B);N.__media=B,i.push(N),L.add(N,"change",r)}L.add(window,"orientationchange",S),L.add(window,"resize",m),y()}function b(g){t.animator.stop();var B=t.track.details;t.track.init(g??(B?B.abs:0))}function I(g){b(g),t.emit("optionsChanged")}function f(g,B){if(g)return d(g),void I(B);M(),A();var N=o();p(),o()!==N?I(B):b(B),t.emit("updated")}function p(){var g=t.options.slides;if(typeof g=="function")return t.options.trackConfig=g(t.size,t.slides);for(var B=t.slides,N=B.length,_=typeof g=="number"?g:D(g,"number",N,!0),z=[],O=D(g,"perView",1,!0),E=D(g,"spacing",0,!0)/t.size||0,k=O==="auto"?E:E/O,h=D(g,"origin","auto"),u=0,T=0;T<_;T++){var w=O==="auto"?c(B[T]):1/O-E+k,C=h==="center"?.5-w/2:h==="auto"?0:h;z.push({origin:C,size:w,spacing:E}),u+=w}if(u+=E*(_-1),h==="auto"&&!t.options.loop&&O!==1){var H=0;z.map((function(F){var q=u-H;return H+=F.size+E,q>=1||(F.origin=1-q-(u>1?0:1-u)),F}))}t.options.trackConfig=z}function m(){M();var g=t.size;t.options.disabled||g===s||(s=g,f())}function S(){m(),setTimeout(m,500),setTimeout(m,2e3)}function M(){var g=ye(t.container);t.size=(t.options.vertical?g.height:g.width)||1}function A(){t.slides=ce(t.options.selector,t.container)}t.container=(v=ce(e,document)).length?v[0]:null,t.destroy=function(){L.purge(),t.emit("destroyed"),x(!0)},t.prev=function(){t.moveToIdx(t.track.details.abs-1,!0)},t.next=function(){t.moveToIdx(t.track.details.abs+1,!0)},t.update=f,d(t.options)}}var ve=function(e,n,t){try{return(function(a,s){var l,i={};return l={emit:function(v){i[v]&&i[v].forEach((function(x){x(l)}));var L=l.options&&l.options[v];L&&L(l)},moveToIdx:function(v,L,x){var r=l.track.idxToDist(v,L);if(r){var y=l.options.defaultAnimation;l.animator.start([{distance:r,duration:D(x||y,"duration",500),easing:D(x||y,"easing",(function(c){return 1+--c*c*c*c*c}))}])}},on:function(v,L,x){x===void 0&&(x=!1),i[v]||(i[v]=[]);var r=i[v].indexOf(L);r>-1?x&&delete i[v][r]:x||i[v].push(L)},options:a},(function(){if(l.track=Ae(l),l.animator=Me(l),s)for(var v=0,L=s;v<L.length;v++)(0,L[v])(l);l.track.init(l.options.initial||0),l.emit("created")})(),l})(n,Te([Fe(e,{drag:!0,mode:"snap",renderMode:"precision",rubberband:!0,selector:".keen-slider__slide"}),He,Ne,Se],t||[],!0))}catch(a){console.error(a)}};const Le=ve.default||ve;let Z=[],R=null,U=typeof Audio<"u"?new Audio:null,W=null;const we=new Map;let P="tones";function ie(){if(!W){const e=window.AudioContext||window.webkitAudioContext;e&&(W=new e)}W&&W.state==="suspended"&&W.resume().catch(()=>{}),U&&!U.src&&(U.src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",U.play().then(()=>{U.pause()}).catch(()=>{}))}typeof window<"u"&&(window.addEventListener("touchstart",ie,{passive:!0}),window.addEventListener("touchend",ie,{passive:!0}),window.addEventListener("click",ie,{passive:!0}));let J=null,ee=null,K=null,X=null;function Oe(e){const n={ā:"a",á:"a",ǎ:"a",à:"a",ē:"e",é:"e",ě:"e",è:"e",ī:"i",í:"i",ǐ:"i",ì:"i",ō:"o",ó:"o",ǒ:"o",ò:"o",ū:"u",ú:"u",ǔ:"u",ù:"u",ǖ:"ü",ǘ:"ü",ǚ:"ü",ǜ:"ü"};return e.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g,t=>n[t])}function Re(e){const n=e.replace("uu","ü").replace("v","ü").replace("lue","lüe").replace("nue","nüe"),t={a:"āáǎà",e:"ēéěè",i:"īíǐì",o:"ōóǒò",u:"ūúǔù",v:"ǖǘǚǜ",ü:"ǖǘǚǜ"};if(!n.slice(-1).match(/\d/))return n;try{const a=parseInt(n.slice(-1)),s=n.slice(0,-1);if(a===0||a===5)return s;let l=-1;for(const i of["a","e","o"])if(s.includes(i)){l=s.indexOf(i);break}if(l===-1){for(let i=s.length-1;i>=0;i--)if("iuvü".includes(s[i])){l=i;break}}if(l!==-1){let i=s[l];if(i==="v"&&(i="ü"),i in t)return s.slice(0,l)+t[i][a-1]+s.slice(l+1)}}catch{return n}return n}function j(e){const n=document.getElementById("app");n&&(n.className=n.className.replace(/bg-canvas-\w+/g,""),n.classList.add(e))}function _e(){const e=document.getElementById("menu-screen"),n=document.getElementById("game-screen"),t=document.getElementById("audio-library-screen"),a=document.getElementById("main-menu"),s=document.getElementById("submenu"),l=document.getElementById("start-tones-btn"),i=document.getElementById("open-submenu-btn"),v=document.getElementById("close-submenu-btn"),L=document.getElementById("open-library-btn"),x=document.getElementById("back-to-main-menu-btn"),r=document.getElementById("start-initials-btn"),y=document.getElementById("start-endings-btn"),c=document.getElementById("back-to-menu-btn"),o=document.getElementById("engine-screen"),d=document.getElementById("open-engine-btn"),b=document.getElementById("back-from-engine-btn");d&&d.addEventListener("click",()=>{e.classList.add("hidden"),a.classList.remove("hidden"),s.classList.add("hidden"),o&&o.classList.remove("hidden"),j("bg-canvas-ice")}),b&&b.addEventListener("click",()=>{o&&o.classList.add("hidden"),e.classList.remove("hidden"),a.classList.remove("hidden"),j("bg-canvas-acid")}),i.addEventListener("click",()=>{a.classList.add("hidden"),s.classList.remove("hidden"),s.classList.add("flex"),j("bg-canvas-lavender")}),v.addEventListener("click",()=>{s.classList.add("hidden"),s.classList.remove("flex"),a.classList.remove("hidden"),j("bg-canvas-acid")}),L.addEventListener("click",()=>{e.classList.add("hidden"),a.classList.remove("hidden"),s.classList.add("hidden"),t.classList.remove("hidden"),j("bg-canvas-navy"),setTimeout(()=>{K&&K.update(),X&&X.update()},60)}),x.addEventListener("click",()=>{t.classList.add("hidden"),e.classList.remove("hidden"),a.classList.remove("hidden"),j("bg-canvas-acid")}),l.addEventListener("click",()=>ue("tones")),r.addEventListener("click",()=>ue("initials")),y.addEventListener("click",()=>ue("endings")),c.addEventListener("click",()=>{n.classList.add("hidden"),e.classList.remove("hidden"),P==="initials"||P==="endings"?(a.classList.add("hidden"),s.classList.remove("hidden"),s.classList.add("flex"),j("bg-canvas-lavender")):(s.classList.add("hidden"),s.classList.remove("flex"),a.classList.remove("hidden"),j("bg-canvas-acid")),document.querySelector(".options").style.display="grid",document.getElementById("play-btn").style.transform="scale(1)",document.getElementById("feedback").innerHTML="[IDENTIFY THE CORRECT TONE CONTOUR]"})}function ue(e){P=e,document.getElementById("menu-screen").classList.add("hidden"),document.getElementById("game-screen").classList.remove("hidden");const n=document.getElementById("game-mode-badge");e==="tones"?(j("bg-canvas-mint"),n&&(n.textContent="DRILL // TONE TRAINER")):e==="initials"?(j("bg-canvas-butter"),n&&(n.textContent="DRILL // INITIALS (声母)")):e==="endings"&&(j("bg-canvas-pink"),n&&(n.textContent="DRILL // ENDINGS (韵母)")),pe()}async function ze(){try{const e=await fetch("/mandarin_tone_trainer/single_words.json");if(!e.ok)throw new Error("JSON not found in public folder");Z=await e.json(),console.log("App Ready. Vocabulary loaded:",Z.length),$e(),setTimeout(()=>{document.querySelectorAll(".tone-btn").forEach(n=>n.classList.remove("pop-up"))},1e3)}catch(e){console.error("Initialization error:",e)}}async function oe(e){ie();const n=e||(R?`/mandarin_tone_trainer/${R.audio}`:null);if(n){if(W)try{W.state==="suspended"&&await W.resume();let t=we.get(n);if(!t){const a=await fetch(n);if(a.ok){const s=await a.arrayBuffer();t=await W.decodeAudioData(s),we.set(n,t)}}if(t){const a=W.createBufferSource();a.buffer=t,a.connect(W.destination),a.start(0);return}}catch(t){console.warn("Web Audio playback failed, trying HTMLAudio fallback:",t)}try{U||(U=new Audio),U.pause(),U.currentTime=0,U.src=n;const t=U.play();t&&t.catch&&t.catch(a=>console.warn("Audio play prevented:",a))}catch(t){console.error("Audio failed:",t)}}}function qe(){document.querySelectorAll(".tone-btn").forEach((e,n)=>{e.addEventListener("click",t=>{ie();const a=e.querySelector(".option-text"),s=(a?a.textContent:e.textContent||"").trim().toLowerCase();let l=!1;if(P==="tones"){const i=(R.pinyin_correct||"").trim().toLowerCase();s===i&&(l=!0)}else if(P==="initials"){const i=(R.initial||"").trim().toLowerCase();(s===i||s==="∅"&&i==="")&&(l=!0)}else if(P==="endings"){const i=(R.ending_base||"").trim().toLowerCase();s===i&&(l=!0)}if(l){document.getElementById("feedback").innerHTML='<span class="bg-black text-canvas-acid px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider animate-bounce">CORRECT! +1</span>',document.querySelector(".options").style.display="none";const i=document.getElementById("fab-container");i.innerHTML=`
          <div class="w-14 h-14 rounded-2xl bg-canvas-acid text-black border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">check</span>
          </div>
        `,i.classList.remove("hidden"),document.getElementById("pinyin-display").innerHTML=`
            <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${R.hanzi}</div>
            <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${R.pinyin_correct}</div>
        `;const v=document.getElementById("explanation-box");let L="";if(P==="initials"||P==="endings"){const x=P==="initials"?R.initial||"∅":R.ending_base,r=P==="initials"?R.initial_explanation:R.final_explanation;L=`
                <div class="relative p-2 text-center">
                    <p class="font-mono text-xs sm:text-sm text-left text-black">
                        <strong class="font-speed font-black text-black">${x}:</strong> 
                        ${r}
                    </p>
                    <button id="next-question-btn" class="mt-3 px-5 py-2 rounded-full bg-black text-white hover:bg-badge-pink border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-hard-black flex items-center gap-2 mx-auto active-collapse transition-colors cursor-pointer">
                        <span>NEXT QUESTION</span>
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            `,v.innerHTML=L,v.classList.remove("hidden"),document.getElementById("next-question-btn").addEventListener("click",pe,{once:!0})}else setTimeout(pe,1500)}else{document.getElementById("feedback").innerHTML='<span class="bg-badge-red text-white px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider">TRY AGAIN</span>';const i=document.getElementById("fab-container");i.innerHTML=`
          <div class="w-14 h-14 rounded-2xl bg-badge-red text-white border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">close</span>
          </div>
        `,i.classList.remove("hidden"),setTimeout(()=>{i.classList.add("hidden")},1e3),oe()}})}),document.getElementById("play-btn").addEventListener("click",oe)}function pe(){document.querySelector(".options").style.display="grid";const e=document.getElementById("play-btn");e.style.transform="scale(1)",document.getElementById("fab-container").classList.add("hidden"),document.getElementById("explanation-box").classList.add("hidden"),R=Z[Math.floor(Math.random()*Z.length)];const n=document.getElementById("pinyin-display"),t=document.querySelectorAll(".tone-btn");if(P==="tones"){n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${R.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${R.pinyin_base}</div>
      `;const a=["High","Rising","Dipping","Falling"];t.forEach((s,l)=>{s.querySelector(".option-text").textContent=R.tone_options[l];const i=s.querySelector(".tone-hint");i&&(i.textContent=a[l])})}else P==="initials"?(n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${R.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          <span class="inline-block w-6 md:w-8 border-b-4 border-black mb-1"></span>${R.ending_correct}
        </div>
      `,t.forEach((a,s)=>{a.querySelector(".option-text").textContent=R.initial_options[s]===""?"∅":R.initial_options[s];const l=a.querySelector(".tone-hint");l&&(l.textContent="")})):P==="endings"&&(n.innerHTML=`
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${R.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          ${R.initial}<span class="inline-block w-8 md:w-12 border-b-4 border-black mb-1"></span>
        </div>
      `,t.forEach((a,s)=>{a.querySelector(".option-text").textContent=Oe(R.ending_options[s]);const l=a.querySelector(".tone-hint");l&&(l.textContent="")}));t.forEach(a=>{a.offsetWidth}),document.getElementById("feedback").innerHTML='<span class="text-white/80">[IDENTIFY THE TARGET SOUND]</span>',oe()}function Ee(e){let n=!1;e.on("created",()=>{e.container.addEventListener("wheel",t=>{if(t.preventDefault(),n)return;const a=t.deltaY;Math.abs(a)<8||(n=!0,a>0?e.next():e.prev(),setTimeout(()=>{n=!1},90))},{passive:!1})})}function $e(){const e=document.getElementById("initials-scroller"),n=document.getElementById("finals-scroller"),t=document.getElementById("library-tone-modal"),a=document.getElementById("modal-pinyin-display"),s=document.getElementById("close-modal-btn"),l=document.getElementById("library-selection-display"),i=document.getElementById("library-main-play-btn"),v=[...new Set(Z.map(c=>c.initial))].sort(),L=[...new Set(Z.map(c=>c.ending_base))].sort();e.innerHTML="",n.innerHTML="",v.forEach((c,o)=>{const d=document.createElement("div");d.className="keen-slider__slide flex items-center justify-center cursor-pointer select-none",d.dataset.index=o;const b=document.createElement("span");b.className="slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150",b.textContent=c===""?"∅":c,d.appendChild(b),e.appendChild(d)}),L.forEach((c,o)=>{const d=document.createElement("div");d.className="keen-slider__slide flex items-center justify-center cursor-pointer select-none",d.dataset.index=o;const b=document.createElement("span");b.className="slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150",b.textContent=c,d.appendChild(b),n.appendChild(d)});function x(c,o){if(!c.track||!c.track.details)return;const d=c.track.details,b=c.container.querySelectorAll(".slide-label");d.slides.forEach((I,f)=>{const p=b[f];if(!p)return;const m=Math.abs(I.distance);m<.5?(p.style.opacity="1",p.style.transform=`scale(${1.2-m*.15})`,p.style.color=o==="initial"?"#000000":"#104FE2",p.style.fontWeight="900"):m<1.5?(p.style.opacity="0.6",p.style.transform="scale(0.95)",p.style.color="#000000",p.style.fontWeight="700"):m<2.5?(p.style.opacity="0.35",p.style.transform="scale(0.85)",p.style.color="#000000",p.style.fontWeight="600"):(p.style.opacity="0.15",p.style.transform="scale(0.75)",p.style.color="#000000",p.style.fontWeight="500")})}function r(){if(!K||!X||!K.track||!X.track||!K.track.details||!X.track.details)return;const c=K.track.details.rel,o=X.track.details.rel;J=v[c],ee=L[o];const d=J==="∅"?"":J,b=d+ee,I=Z.filter(f=>f.initial===d&&f.ending_base===ee);I.length>0?(l.innerHTML=`
                <span class="font-chinese font-black text-2xl sm:text-3xl text-black">${b}</span>
                <span class="ml-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-bold bg-black text-canvas-acid px-2 py-0.5 rounded border border-black shadow-sm">
                  ${I.length} TONE${I.length>1?"S":""}
                </span>
            `,i.disabled=!1):(l.innerHTML=`
                <span class="font-chinese text-2xl font-bold text-black/30 line-through">${b}</span>
                <span class="ml-2 font-mono text-xs uppercase tracking-wider text-badge-red font-black">(No syllable)</span>
            `,i.disabled=!0)}K=new Le(e,{vertical:!0,mode:"free-snap",rubberband:!0,slides:{origin:"center",perView:7,spacing:0},initial:0,created(c){x(c,"initial")},detailsChanged(c){x(c,"initial")},slideChanged(){r()}},[Ee]),X=new Le(n,{vertical:!0,mode:"free-snap",rubberband:!0,slides:{origin:"center",perView:7,spacing:0},initial:0,created(c){x(c,"final")},detailsChanged(c){x(c,"final")},slideChanged(){r()}},[Ee]),e.addEventListener("click",c=>{const o=c.target.closest(".keen-slider__slide");if(o&&K){const d=parseInt(o.dataset.index);K.moveToIdx(d,!0,{duration:250})}}),n.addEventListener("click",c=>{const o=c.target.closest(".keen-slider__slide");if(o&&X){const d=parseInt(o.dataset.index);X.moveToIdx(d,!0,{duration:250})}});function y(){(!J||!ee)&&r();const c=J==="∅"?"":J,o=c+ee;a.textContent=o,t.querySelectorAll(".tone-select-btn").forEach((b,I)=>{const f=I+1,p=Re(`${o}${f}`);b.textContent=p,Z.find(S=>S.initial===c&&S.ending_base===ee&&S.tone===f)?(b.disabled=!1,b.classList.remove("opacity-30","cursor-not-allowed","pointer-events-none"),b.classList.add("hover:bg-white","cursor-pointer")):(b.disabled=!0,b.classList.add("opacity-30","cursor-not-allowed","pointer-events-none"),b.classList.remove("hover:bg-white","cursor-pointer"))}),t.classList.remove("hidden")}i.addEventListener("click",y),s.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",c=>{const o=c.target.closest(".tone-select-btn");if(o&&!o.disabled){const d=parseInt(o.dataset.tone),b=J==="∅"?"":J,I=Z.find(f=>f.initial===b&&f.ending_base===ee&&f.tone===d);if(I){const f=`/mandarin_tone_trainer/${I.audio}`;oe(f)}else console.warn(`No audio found for ${b}${ee}${d}`)}}),setTimeout(r,50)}window.addEventListener("keydown",e=>{const n=document.getElementById("game-screen"),t=document.getElementById("engine-screen");if(n&&!n.classList.contains("hidden"))if(e.key>="1"&&e.key<="4"){const a=parseInt(e.key)-1,s=document.querySelectorAll(".tone-btn")[a];s&&document.querySelector(".options").style.display!=="none"&&s.click()}else e.code==="Space"&&(e.preventDefault(),oe());else if(t&&!t.classList.contains("hidden")&&e.code==="Space"){e.preventDefault();const a=document.getElementById("engine-record-btn");a&&a.click()}});function De(){const e=document.getElementById("engine-record-btn"),n=document.getElementById("engine-next-btn"),t=document.getElementById("engine-reset-btn"),a=document.getElementById("coach-hear-user-btn"),s=document.getElementById("engine-step-counter"),l=[{syllablesCount:2,hanzi:"你 好",pinyin:"nǐ hǎo",gloss:"Hello",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ní hǎo"},{syllablesCount:1,hanzi:"妈",pinyin:"mā",gloss:"Mother",sandhi:"/ Tone 1: High Level 55 /",spoken:"mā"},{syllablesCount:3,hanzi:"对 不 起",pinyin:"duì bu qǐ",gloss:"Sorry",sandhi:"/ 4th + Neutral + 3rd /",spoken:"duì bu qǐ"},{syllablesCount:2,hanzi:"可 以",pinyin:"kě yǐ",gloss:"Can / May",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ké yǐ"},{syllablesCount:1,hanzi:"好",pinyin:"hǎo",gloss:"Good",sandhi:"/ Tone 3: Low-Dipping 214 /",spoken:"hǎo"},{syllablesCount:3,hanzi:"冰 淇 淋",pinyin:"bīng qí lín",gloss:"Ice Cream",sandhi:"/ 1st + 2nd + 2nd /",spoken:"bīng qí lín"},{syllablesCount:2,hanzi:"水 果",pinyin:"shuǐ guǒ",gloss:"Fruit",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"shuí guǒ"},{syllablesCount:3,hanzi:"没 关 系",pinyin:"méi guān xi",gloss:"It's Okay",sandhi:"/ 2nd + 1st + Neutral /",spoken:"méi guān xi"},{syllablesCount:1,hanzi:"马",pinyin:"mǎ",gloss:"Horse",sandhi:"/ Tone 3: Low-Dipping 214 /",spoken:"mǎ"},{syllablesCount:2,hanzi:"手 表",pinyin:"shǒu biǎo",gloss:"Watch",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"shóu biǎo"}];let i=!1,v=0;function L(r,y){document.querySelectorAll("#engine-syllable-toggle-group button").forEach((T,w)=>{w+1===r?T.className="px-2 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer":T.className="px-2 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer"});let o=y;o||(r===1?o={syllablesCount:1,hanzi:"妈",pinyin:"mā",gloss:"Mother",sandhi:"/ Tone 1: High Level 55 /",spoken:"mā"}:r===3?o={syllablesCount:3,hanzi:"对 不 起",pinyin:"duì bu qǐ",gloss:"Sorry",sandhi:"/ 4th + Neutral + 3rd /",spoken:"duì bu qǐ"}:o={syllablesCount:2,hanzi:"你 好",pinyin:"nǐ hǎo",gloss:"Hello",sandhi:"/ 3rd + 3rd ➔ 2nd + 3rd /",spoken:"ní hǎo"});const d=document.getElementById("engine-hanzi-display"),b=document.getElementById("engine-pinyin-display"),I=document.getElementById("engine-gloss-display"),f=document.getElementById("engine-stage-label"),p=document.getElementById("engine-sandhi-badge"),m=document.getElementById("engine-arena-subtitle");d&&(d.textContent=o.hanzi),b&&(b.textContent=o.pinyin),I&&(I.textContent=`"${o.gloss}"`),r===1?(f&&(f.textContent="[STAGE 1: ISOLATED SYLLABLE]"),m&&(m.textContent="CHAO 5-LEVEL SINGLE-CONTOUR"),p&&(p.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Isolated Tone Profile</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${o.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${o.spoken}</span>
        `)):r===3?(f&&(f.textContent="[STAGE 3: 3-SYLLABLE & NEUTRAL TONE]"),m&&(m.textContent="CHAO 5-LEVEL TRIPLE-CONTOUR"),p&&(p.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Compound Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${o.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${o.spoken}</span>
        `)):(f&&(f.textContent="[STAGE 2: TONE SANDHI]"),m&&(m.textContent="CHAO 5-LEVEL DUAL-CONTOUR"),p&&(p.innerHTML=`
          <span class="block text-[9px] text-white/90 uppercase font-black">Sandhi Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${o.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${o.spoken}</span>
        `));const S=document.getElementById("pitch-chart-wrapper"),M=document.getElementById("pitch-chart-svg"),A=document.getElementById("pitch-grid-levels"),g=document.getElementById("pitch-syllable-dividers"),B=document.getElementById("pitch-target-ribbons"),N=document.getElementById("user-pitch-paths-container"),_=document.getElementById("user-pitch-points-container"),z=document.getElementById("engine-live-waveform-group"),O=document.getElementById("pitch-time-milestones"),E=document.getElementById("pitch-timeline-fill"),k=document.getElementById("pitch-timeline-text");if(r===1){S&&(S.className="flex gap-1.5 items-center justify-center max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] mx-auto my-auto transition-all duration-300"),M&&M.setAttribute("viewBox","0 0 350 155"),A&&(A.innerHTML=`
          <line x1="15" y1="15" x2="335" y2="15" />
          <line x1="15" y1="46" x2="335" y2="46" />
          <line x1="15" y1="78" x2="335" y2="78" />
          <line x1="15" y1="110" x2="335" y2="110" />
          <line x1="15" y1="140" x2="335" y2="140" />
        `),g&&(g.innerHTML="");const T=o.sandhi&&o.sandhi.includes("Dipping");B&&(T?B.innerHTML=`
            <polygon id="target-ribbon-s1" points="40,105 160,146 310,48 310,30 160,126 40,85" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `:B.innerHTML=`
            <polygon id="target-ribbon-s1" points="40,22 310,22 310,8 40,8" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(T?N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 40,95 Q 160,142 310,40" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `:N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 40,15 Q 175,13 310,15" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),_&&(T?_.innerHTML=`
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="100" cy="118" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="160" cy="142" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="235" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="40" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `:_.innerHTML=`
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
        `),O&&(O.innerHTML=`
          <text x="40" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
          <text x="175" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[${o.pinyin}] ~320ms</text>
          <text x="310" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
        `),E&&(E.style.width="55%"),k&&(k.textContent="0.18s / 0.32s")}else S&&(S.className="flex gap-1.5 items-center justify-center w-full my-auto transition-all duration-300"),M&&M.setAttribute("viewBox","0 0 660 155"),A&&(A.innerHTML=`
          <line x1="20" y1="15" x2="640" y2="15" />
          <line x1="20" y1="46" x2="640" y2="46" />
          <line x1="20" y1="78" x2="640" y2="78" />
          <line x1="20" y1="110" x2="640" y2="110" />
          <line x1="20" y1="140" x2="640" y2="140" />
        `),z&&(z.innerHTML=`
          <path d="M 50,80 Q 90,50 130,80 T 210,80 T 290,80 T 370,80 T 450,80 T 530,80 T 610,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="330" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `),r===3?(g&&(g.innerHTML=`
            <line x1="225" y1="8" x2="225" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="231" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 2 [bu] ➔</text>
            <line x1="435" y1="8" x2="435" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="441" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 3 [qǐ] ➔</text>
          `),B&&(B.innerHTML=`
            <polygon id="target-ribbon-s1" points="35,16 195,135 195,115 35,6" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="245,95 405,102 405,86 245,80" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s3" points="455,98 535,146 625,56 625,38 535,126 455,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 35,18 Q 115,70 195,126" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 245,90 Q 325,92 405,96" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s3" d="M 455,92 Q 535,142 625,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),_&&(_.innerHTML=`
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
          `),O&&(O.innerHTML=`
            <text x="35" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="115" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[duì]</text>
            <text x="195" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.28s</text>
            <text x="245" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.30s</text>
            <text x="325" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[bu]</text>
            <text x="405" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.46s</text>
            <text x="455" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.48s</text>
            <text x="540" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[qǐ]</text>
            <text x="625" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.85s</text>
          `),E&&(E.style.width="55%"),k&&(k.textContent="0.46s / 0.85s")):(g&&(g.innerHTML=`
            <line x1="330" y1="8" x2="330" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="336" y="20" class="font-mono text-[9px] fill-black/60 font-black">SYLLABLE 2 [hǎo] ➔</text>
          `),B&&(B.innerHTML=`
            <polygon id="target-ribbon-s1" points="70,95 300,28 300,10 70,75" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="360,98 470,146 600,52 600,32 470,126 360,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `),N&&(N.innerHTML=`
            <path id="user-pitch-path-s1" d="M 70,85 Q 180,54 300,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 360,88 Q 465,138 600,45" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `),_&&(_.innerHTML=`
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
          `),O&&(O.innerHTML=`
            <text x="70" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="180" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: n] [Final: í]</text>
            <text x="300" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
            <text x="360" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.34s</text>
            <text x="480" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: h] [Final: ǎo]</text>
            <text x="600" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.72s</text>
          `),E&&(E.style.width="45%"),k&&(k.textContent="0.32s / 0.72s"));const h=document.getElementById("phonetic-audit-grid");h&&(r===1?(h.className="grid grid-cols-1 max-w-sm sm:max-w-md mx-auto gap-2",h.innerHTML=`
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 1: [${o.pinyin}]</span>
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
        `));const u=document.getElementById("coach-advice-text");u&&(r===1?u.innerHTML='"Laser-flat pitch! Keep your voice steady at <strong class="bg-black text-white px-1.5 py-0.5 rounded">Level 5 (55)</strong> without letting it drift down at the end."':r===3?u.innerHTML=`"On the neutral tone <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'bu'</strong>, keep it ultra-brief (~100ms) and light. Do not stress or lengthen it—it should bounce smoothly into <em class="text-badge-cobalt font-black">'qǐ'</em>."`:u.innerHTML=`"You flattened out too early on <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'ní'</strong>. Keep your pitch climbing all the way to the top, like asking a surprised question: <em class="text-badge-cobalt font-black">'Really?!'</em>"`)}function x(r){v=Math.max(0,Math.min(r,l.length-1));const y=l[v];y&&L(y.syllablesCount,y),s&&(s.textContent=`STEP ${v+1} / ${l.length}`)}n&&n.addEventListener("click",()=>{const r=(v+1)%l.length;x(r)}),t&&t.addEventListener("click",()=>{x(0),window.PronunciationEngine&&window.PronunciationEngine.setRevealState(1)}),a&&a.addEventListener("click",()=>{const r=a.innerHTML;a.innerHTML='<span class="material-symbols-outlined text-sm animate-spin">sync</span> PLAYING USER TRACK...',a.classList.add("bg-badge-tangerine","text-white"),setTimeout(()=>{a.innerHTML=r,a.classList.remove("bg-badge-tangerine","text-white")},1200)}),e&&e.addEventListener("click",()=>{i=!i;const r=e.querySelector("span:nth-child(2)"),y=e.querySelector("span:nth-child(1)");i?(e.classList.replace("bg-badge-tangerine","bg-black"),e.classList.add("text-badge-tangerine"),e.classList.remove("text-white"),r&&(r.textContent="LISTENING... (TAP TO STOP)"),y&&y.classList.add("bg-badge-tangerine","scale-125")):(e.classList.replace("bg-black","bg-badge-tangerine"),e.classList.remove("text-badge-tangerine"),e.classList.add("text-white"),r&&(r.textContent="TAP TO RETRY"),y&&y.classList.remove("bg-badge-tangerine","scale-125"))}),window.PronunciationEngine={setRevealState(r){const y=document.getElementById("user-voice-track-group"),c=document.getElementById("engine-live-waveform-group"),o=document.getElementById("phonetic-audit-section"),d=document.getElementById("articulatory-coach-card");document.querySelectorAll("#engine-state-toggle-group button").forEach((I,f)=>{(f===0?1:f===1?2:4)===r?I.className="px-1.5 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer":I.className="px-1.5 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer"}),r===1?(y&&y.classList.add("hidden"),c&&c.classList.add("hidden"),o&&o.classList.add("hidden"),d&&d.classList.add("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TAP TO RECORD</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `)):r===2?(y&&y.classList.add("hidden"),c&&c.classList.remove("hidden"),o&&o.classList.add("hidden"),d&&d.classList.add("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-black text-badge-tangerine border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-badge-tangerine animate-ping border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">RECORDING...</span>
            <span class="font-mono text-[10px] bg-badge-tangerine text-black px-1.5 py-0.5 rounded hidden sm:inline">[STOP]</span>
          `)):(y&&y.classList.remove("hidden"),c&&c.classList.add("hidden"),o&&o.classList.remove("hidden"),d&&d.classList.remove("hidden"),e&&(e.className="flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer",e.innerHTML=`
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TAP TO RETRY</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `))},setSyllableCount(r,y){L(r,y)},setTargetWord(r){r.syllablesCount?L(r.syllablesCount,r):(r.hanzi&&(document.getElementById("engine-hanzi-display").textContent=r.hanzi),r.pinyin&&(document.getElementById("engine-pinyin-display").textContent=r.pinyin),r.gloss&&(document.getElementById("engine-gloss-display").textContent=`"${r.gloss}"`))},selectWordIndex(r){x(r)},updateUserCurves({pathS1:r,pathS2:y,pathS3:c}){if(r){const o=document.getElementById("user-pitch-path-s1");o&&o.setAttribute("d",r)}if(y){const o=document.getElementById("user-pitch-path-s2");o&&o.setAttribute("d",y)}if(c){const o=document.getElementById("user-pitch-path-s3");o&&o.setAttribute("d",c)}},updateTargetRibbons({pointsS1:r,pointsS2:y,pointsS3:c}){if(r){const o=document.getElementById("target-ribbon-s1");o&&o.setAttribute("points",r)}if(y){const o=document.getElementById("target-ribbon-s2");o&&o.setAttribute("points",y)}if(c){const o=document.getElementById("target-ribbon-s3");o&&o.setAttribute("points",c)}},setCoachingAdvice(r){const y=document.getElementById("coach-advice-text");y&&(y.innerHTML=r)}}}qe();_e();De();ze();
