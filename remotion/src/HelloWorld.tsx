import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  Video,
  staticFile,
  Sequence,
  spring,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

// Isso aqui é o que cria os campos no navegador!
export const myCompSchema = z.object({
  titleText: z.string(),
});

export const HelloWorld: React.FC<z.infer<typeof myCompSchema>> = ({
  titleText, // Agora ele recebe a frase do navegador aqui
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scale = interpolate(Math.sin(frame / 10), [-1, 1], [1, 1.1]);
  const startArrowFrame = durationInFrames - 60;
  const arrowSpring = spring({ frame: frame - startArrowFrame, fps, config: { damping: 10 } });
  const arrowBounce = interpolate(Math.sin(frame / 5), [-1, 1], [0, 20]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Video
        src={staticFile("Sapatenis_dois.mp4")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", top: -150 }}>
        <div style={{
          transform: `scale(${scale})`,
          color: "white",
          fontSize: 90,
          fontWeight: "bold",
          fontFamily: "sans-serif",
          textShadow: "0px 0px 15px rgba(255,0,0,0.8)",
          textAlign: "center",
          backgroundColor: "rgba(0,0,0,0.3)",
          padding: "10px 30px",
          borderRadius: "20px"
        }}>
          {titleText} {/* <--- O SEGREDO TÁ AQUI: Ele usa o que você digitar no painel */}
        </div>
      </AbsoluteFill>

      <Sequence from={startArrowFrame}>
        <AbsoluteFill style={{ 
          justifyContent: "flex-end", 
          alignItems: "flex-start", 
          paddingLeft: 60,
          paddingBottom: 450,
          transform: `scale(${arrowSpring}) translateY(${arrowBounce}px)` 
        }}>
          <div style={{ fontSize: 150, filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.5))" }}>⬇️</div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};