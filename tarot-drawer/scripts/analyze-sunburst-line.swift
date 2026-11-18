import Foundation
import AppKit
struct Raster {
 let rep:NSBitmapImageRep
 let w:Int;let h:Int;let stride:Int;let channels:Int
 init(_ path:String){rep=NSBitmapImageRep(data:FileManager.default.contents(atPath:path)!)!;w=rep.pixelsWide;h=rep.pixelsHigh;stride=rep.bytesPerRow;channels=rep.bitsPerPixel/8}
 func ink(_ x:Int,_ y:Int)->Double{let p=rep.bitmapData!;return 1-Double(p[max(0,min(h-1,y))*stride+max(0,min(w-1,x))*channels])/255}
 func density(_ rect:[Int])->Double{var sum=0.0;var count=0;for y in rect[1]..<rect[3]{for x in rect[0]..<rect[2]{sum+=ink(x,y);count+=1}};return sum/Double(count)}
}
let root=CommandLine.arguments[1]
let batch=CommandLine.arguments.count>2 ? CommandLine.arguments[2] : "02"
let start=(Int(batch)!-1)*3+1
let numbers=Array(start...(start+2))
let specPath=root+"/docs/tarot-sunburst/batch-\(batch)/source-integrity.json"
let specs=(try? JSONSerialization.jsonObject(with:Data(contentsOf:URL(fileURLWithPath:specPath)))) as? [String:[String:Any]] ?? [:]
var records:[[String:Any]]=[]
for n in numbers{
 let source=Raster(root+"/docs/tarot-sunburst/line/\(n).png"),finished=Raster(root+"/docs/tarot-sunburst/batch-\(batch)/\(n)-ink.png")
 var originalBlack=0,retained=0,authorizedExcluded=0
 let excluded=(specs[String(n)]?["fidelityIgnoreCircles"] as? [[Double]]) ?? []
 for y in 0..<source.h{for x in 0..<source.w where source.ink(x,y)>0.65{
  if excluded.contains(where:{pow(Double(x)-$0[0],2)+pow(Double(y)-$0[1],2) <= $0[2]*$0[2]}){authorizedExcluded+=1;continue}
  originalBlack+=1;let mx=Int((Double(x)+0.5)*Double(finished.w)/Double(source.w)),my=Int((Double(y)+0.5)*Double(finished.h)/Double(source.h));var found=false
  for dy in -3...3{for dx in -3...3{if finished.ink(mx+dx,my+dy)>0.45{found=true}}}
  if found{retained+=1}
 }}
 let rects:[Int:[Int]]=[1:[348,575,426,797],2:[350,882,428,1070],3:[419,825,576,1086],4:[340,738,688,922],5:[349,684,454,859],6:[390,405,625,650]]
 records.append(["number":n,"originalSize":[source.w,source.h],"inkMasterSize":[finished.w,finished.h],"originalBlackPixels":originalBlack,"authorizedChangeOriginalBlackPixelsExcluded":authorizedExcluded,"originalBlackPixelsNearFinishedInk":retained,"retentionWithin3MasterPixels":Double(retained)/Double(originalBlack),"representativeShadowInkFraction":finished.density(rects[n] ?? [300,400,720,1100])])
}
let fool=Raster(root+"/docs/tarot-sunburst/fool-pipeline/ink-generated.png")
let data=try! JSONSerialization.data(withJSONObject:["method":"Read-only raster audit. Original dark pixels must have finished ink within 3 master pixels; tolerates subpixel waviness, local line thickening and authorized finger thinning. Ink fractions are local comparison guides, not whole-card style scores.","cards":records,"foolTunicReferenceInkFraction":fool.density([445,515,630,750])],options:[.prettyPrinted,.sortedKeys])
print(String(data:data,encoding:.utf8)!)
