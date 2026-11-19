import AppKit
import CryptoKit
let root=URL(fileURLWithPath:CommandLine.arguments.count>1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath)
let out=root.appendingPathComponent("docs/tarot-sunburst/light-paint")
let manifest=try JSONSerialization.jsonObject(with:Data(contentsOf:out.appendingPathComponent("manifest.json"))) as! [String:Any]
var results:[[String:Any]]=[]
for card in manifest["cards"] as! [[String:Any]] {
 let n=card["number"] as! Int
 let ink=NSBitmapImageRep(data:try Data(contentsOf:out.appendingPathComponent(card["ink"] as! String)))!,flat=NSBitmapImageRep(data:try Data(contentsOf:out.appendingPathComponent(card["colour"] as! String)))!
 let path=n==0 ? "docs/tarot-sunburst/fool-pipeline/fool-N-source.png" : String(format:"docs/tarot-sunburst/batch-%02d/%d-N-source.png",(n-1)/3+1,n)
 let source=NSBitmapImageRep(data:try Data(contentsOf:root.appendingPathComponent(path)))!
 var differences=0,notOpaque=0,transparent=0
 precondition(ink.pixelsWide==1024 && ink.pixelsHigh==1536 && flat.pixelsWide==1024 && flat.pixelsHigh==1536)
 for y in 0..<1536 {for x in 0..<1024 {let a=ink.bitmapData![y*ink.bytesPerRow+x*ink.samplesPerPixel+3],b=source.bitmapData![y*source.bytesPerRow+x*source.samplesPerPixel];if a != b {differences+=1};if a==0{transparent+=1};if flat.bitmapData![y*flat.bytesPerRow+x*flat.samplesPerPixel+3] != 255 {notOpaque+=1}}}
 precondition(differences==0 && notOpaque==0 && transparent>0)
 results.append(["number":n,"inkAlphaDifferences":differences,"nonOpaqueColourPixels":notOpaque,"transparentInkPixels":transparent,"inkFileSHA256":SHA256.hash(data:try Data(contentsOf:out.appendingPathComponent(card["ink"] as! String))).map{String(format:"%02x",$0)}.joined()]);print("Verified",n)
}
try JSONSerialization.data(withJSONObject:results,options:[.prettyPrinted,.sortedKeys]).write(to:out.appendingPathComponent("pixel-validation.json"))
