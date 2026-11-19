// Verify the current exported master agrees with the structural R channel.
import AppKit
import CryptoKit
let root=URL(fileURLWithPath:CommandLine.arguments.count>1 ? CommandLine.arguments[1] : FileManager.default.currentDirectoryPath)
var results:[[String:Any]]=[]
for n in 1...21 {
 let dir=String(format:"docs/tarot-sunburst/batch-%02d/",(n-1)/3+1),masterName="\(n)-ink"+(n==6 ? "-current" : "")+".png"
 let masterData=try Data(contentsOf:root.appendingPathComponent(dir+masterName)),plateData=try Data(contentsOf:root.appendingPathComponent(dir+"\(n)-N-source.png"))
 let master=NSBitmapImageRep(data:masterData)!,plate=NSBitmapImageRep(data:plateData)!
 precondition(master.pixelsWide==1024 && master.pixelsHigh==1536 && plate.pixelsWide==1024 && plate.pixelsHigh==1536)
 var maxDelta=0,overOne=0,excludedTextPixels=0
 for y in 0..<1536 {for x in 0..<1024 {if n==2 {let X=Double(x)*819/1024,Y=Double(y)*1229/1536;if (X>=135 && X<=203 && Y>=375 && Y<=459) || (X>=621 && X<=686 && Y>=375 && Y<=459) || (X>=345 && X<=478 && Y>=610 && Y<=665) {excludedTextPixels+=1;continue}}
 let a=255-Int(master.bitmapData![y*master.bytesPerRow+x*master.samplesPerPixel]),b=Int(plate.bitmapData![y*plate.bytesPerRow+x*plate.samplesPerPixel]),d=abs(a-b);maxDelta=max(maxDelta,d);if d>1 {overOne+=1}}}
 precondition(overOne==0,"Ink plate mismatch for card \(n)")
 results.append(["number":n,"master":dir+masterName,"masterSHA256":SHA256.hash(data:masterData).map{String(format:"%02x",$0)}.joined(),"plateSHA256":SHA256.hash(data:plateData).map{String(format:"%02x",$0)}.joined(),"maximumDifference":maxDelta,"pixelsDifferingMoreThanOne":overOne,"approvedTextOverlayPixelsExcluded":excludedTextPixels]);print("Verified ink",n,maxDelta)
}
try JSONSerialization.data(withJSONObject:results,options:[.prettyPrinted,.sortedKeys]).write(to:root.appendingPathComponent("docs/tarot-sunburst/current-ink-channel-validation.json"))
