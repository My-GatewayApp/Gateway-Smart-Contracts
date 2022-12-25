import * as nearAPI from "near-api-js"
import { Gas, NEAR } from "near-units";


export interface GatewayNFTMarketplace extends nearAPI.Contract {


  //call functions
  new_default_meta(options: {
    args: {
      [key: string]: any;
    };
    gas?: Gas;
    attachedDeposit?: NEAR;
    walletMeta?: string;
    walletCallbackUrl?: string;
    stringify?: (input: any) => Buffer;
  }): Promise<void>;


  create_series(options: {
    args: {
      [key: string]: any;
    };
    gas?: Gas;
    attachedDeposit?: NEAR;
    walletMeta?: string;
    walletCallbackUrl?: string;
    stringify?: (input: any) => Buffer;
  }): Promise<void>;


  mint_badge(options: {
    args: {
      [key: string]: any;
    };
    gas?: Gas;
    attachedDeposit?: NEAR;
    walletMeta?: string;
    walletCallbackUrl?: string;
    stringify?: (input: any) => Buffer;
  }): Promise<void>;

  //view functions
  nft_metadata(options: {
    args: {
      [key: string]: any;
    };
    gas?: Gas;
    attachedDeposit?: NEAR;
    walletMeta?: string;
    walletCallbackUrl?: string;
    stringify?: (input: any) => Buffer;
  }): Promise<any>;


}
