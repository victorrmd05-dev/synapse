import { Composition } from "remotion";
import { HelloWorld, myCompSchema } from "./HelloWorld";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Anuncio-Sapatenis"
        component={HelloWorld}
        durationInFrames={150} // 5 segundos a 30fps
        fps={30}
        width={1080}
        height={1920
        }
        schema={myCompSchema}
        defaultProps={{
          titleText: "Aproveita Oferta",
          titleColor: "#ffffff",
          priceText: "R$ 99,90", // Se você estiver usando a versão com preço
        }}
      />
    </>
  );
};