import React from "react";
import { AbsoluteFill } from "remotion";
import { Chopper, DogBottle, DogHead, DogWalking, CatFish, ProductTile44 } from "./products44";

/** QA sheet for the illustrated products of the 44 s ad. */
export const ProductsQA: React.FC = () => (
  <AbsoluteFill style={{ background: "#0A0F1E", display: "flex", flexWrap: "wrap", gap: 20, padding: 30, alignContent: "flex-start" }}>
    <Chopper size={480} press={0.2} dice={0} hand />
    <Chopper size={480} press={1} dice={0.8} hand />
    <div style={{ display: "flex", alignItems: "flex-end" }}>
      <DogBottle height={460} bowl={0.8} level={0.6} press={1} flow={1} t={0.3} hand />
      <DogHead size={360} lap={0.8} />
    </div>
    <DogWalking size={500} t={0.4} />
    <CatFish size={420} wag={0.6} />
    <ProductTile44 kind="chopper" size={200} />
    <ProductTile44 kind="dogbottle" size={200} />
    <ProductTile44 kind="catfish" size={200} />
  </AbsoluteFill>
);
