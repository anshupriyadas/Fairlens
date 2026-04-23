import { RegulatoryFlag } from "./types";

export function getRemediations(flagId: string) {
  if (flagId === "reg-b") {
    return [
      {
        title: "Recalibrate thresholds per subgroup",
        description: "Adjust the decision boundary specifically for female applicants to achieve demographic parity without altering the underlying model."
      },
      {
        title: "Adversarial debiasing",
        description: "Train a secondary model to predict the protected attribute from the main model's representations, penalizing the main model when it leaks gender information."
      },
      {
        title: "Audit data collection on gender",
        description: "Review upstream data sourcing to identify missing or mislabeled gender data that might be skewing historical baselines."
      }
    ];
  }
  
  if (flagId === "fha-proxy") {
    return [
      {
        title: "Drop feature 'zipcode' from training",
        description: "Remove geographic indicators from the feature set, as they strongly correlate with race and violate FHA guidelines."
      },
      {
        title: "Apply post-hoc reweighting on zipcode",
        description: "Decrease the importance of geographic features in the final scoring mechanism, replacing them with direct financial indicators."
      }
    ];
  }

  return [
    {
      title: "General model retuning",
      description: "Review all features and model weights to identify sources of systemic bias."
    }
  ];
}
