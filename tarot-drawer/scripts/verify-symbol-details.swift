import AppKit
import CryptoKit
let root=URL(fileURLWithPath:CommandLine.arguments[1]),folder=root.appendingPathComponent("docs/tarot-sunburst/symbol-details-2026-11-23")
func bitmap(_ path:URL)->NSBitmapImageRep{NSBitmapImageRep(data:try! Data(contentsOf:path))!}
let cards:[(Int,String)]=[(3,"empress"),(5,"hierophant"),(6,"lovers"),(7,"chariot"),(10,"wheel-of-fortune"),(14,"temperance"),(16,"tower"),(18,"moon")]
var result:[[String:Any]]=[]
for (n,id) in cards {let prefix=String(format:"%02d",n)+"-"+id,base=folder.appendingPathComponent("before/"+prefix+"-colour.png"),current=root.appendingPathComponent("docs/tarot-sunburst/light-paint/"+prefix+"-colour.png"),a=bitmap(base),b=bitmap(current);var count=0,minx=1024,miny=1536,maxx=0,maxy=0
 for y in 0..<1536 {for x in 0..<1024 {let ai=y*a.bytesPerRow+x*a.bitsPerPixel/8,bi=y*b.bytesPerRow+x*b.bitsPerPixel/8;if (0..<3).contains(where:{a.bitmapData![ai+$0] != b.bitmapData![bi+$0]}){count+=1;minx=min(minx,x);maxx=max(maxx,x);miny=min(miny,y);maxy=max(maxy,y)}}}
 let oldInk=try! Data(contentsOf:folder.appendingPathComponent("before/"+prefix+"-ink-transparent.png")),newInk=try! Data(contentsOf:root.appendingPathComponent("docs/tarot-sunburst/light-paint/"+prefix+"-ink-transparent.png"))
 result.append(["card":n,"inkByteIdentical":oldInk==newInk,"changedRGBPixels":count,"changedBounds":[minx,miny,maxx,maxy]])
}
let mp=root.appendingPathComponent("docs/tarot-sunburst/light-paint/18-moon-colour.png"),b=bitmap(mp);var seen=Set<Int>(),drops=0
for y in 530..<660 {for x in 290..<735 {let k=y*1024+x;if seen.contains(k){continue};func gold(_ xx:Int,_ yy:Int)->Bool{let p=yy*b.bytesPerRow+xx*b.bitsPerPixel/8;return b.bitmapData![p]>170 && b.bitmapData![p+1]>120 && b.bitmapData![p+2]<165};if !gold(x,y){continue};var q=[k],head=0;seen.insert(k);while head<q.count{let p=q[head];head+=1;let xx=p%1024,yy=p/1024;for (nx,ny) in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]{if nx<290 || nx>=735 || ny<530 || ny>=660{continue};let nk=ny*1024+nx;if !seen.contains(nk) && gold(nx,ny){seen.insert(nk);q.append(nk)}}};if q.count>15 && !q.contains(where:{$0/1024>=659 || $0%1024<=290 || $0%1024>=734}){drops+=1}}}
let data=try! JSONSerialization.data(withJSONObject:["cards":result,"moonColourDropletComponents":drops],options:[.prettyPrinted,.sortedKeys]);try! data.write(to:folder.appendingPathComponent("pixel-verification.json"));print(String(data:data,encoding:.utf8)!)
