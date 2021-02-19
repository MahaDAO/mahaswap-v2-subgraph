/* eslint-disable prefer-const */
import { Address, log } from '@graphprotocol/graph-ts'
import { UniswapFactory, Pair, UniPair, Token, Bundle } from '../types/schema'
import { PairCreated } from '../types/Factory/Factory'

import { Pair as PairTemplate, UniPair as UniPairTemplate } from '../types/templates'
import {
  FACTORY_ADDRESS,
  ZERO_BD,
  ZERO_BI,
  WETH,
  USDC,
  DAI,
  DAI_WETH_PAIR,
  USDC_WETH_PAIR,
  fetchTokenSymbol,
  fetchTokenName,
  fetchTokenDecimals,
  fetchTokenTotalSupply
} from './helpers'


const createOrLoadToken = (addr: Address): Token | null => {
  let token1 = Token.load(addr.toHexString())
  if (token1 != null) return token1;

  // fetch info if null

  let token0 = new Token(addr.toHexString())
  token0.symbol = fetchTokenSymbol(addr)
  token0.name = fetchTokenName(addr)
  token0.totalSupply = fetchTokenTotalSupply(addr)
  let decimals = fetchTokenDecimals(addr)

  // bail if we couldn't figure out the decimals
  if (decimals === null) {
    log.debug('mybug the decimal on token 0 was null', [])
    return null
  }

  token0.decimals = decimals;
  token0.derivedETH = ZERO_BD;
  token0.tradeVolume = ZERO_BD;
  token0.tradeVolumeUSD = ZERO_BD;
  token0.untrackedVolumeUSD = ZERO_BD;
  token0.totalLiquidity = ZERO_BD;
  token0.txCount = ZERO_BI;

  token0.save()
  return token0;
}


const registerUniPair = (addr: Address, token0: Address, token1: Address): void => {
  let weth = createOrLoadToken(token0)
  let usdc = createOrLoadToken(token1)

  let unipair = new UniPair(addr.toHexString()) as UniPair
  unipair.token0 = weth.id
  unipair.token1 = usdc.id
  unipair.liquidityProviderCount = ZERO_BI
  unipair.txCount = ZERO_BI
  unipair.reserve0 = ZERO_BD
  unipair.reserve1 = ZERO_BD
  unipair.trackedReserveETH = ZERO_BD
  unipair.reserveETH = ZERO_BD
  unipair.reserveUSD = ZERO_BD
  unipair.totalSupply = ZERO_BD
  unipair.volumeToken0 = ZERO_BD
  unipair.volumeToken1 = ZERO_BD
  unipair.volumeUSD = ZERO_BD
  unipair.untrackedVolumeUSD = ZERO_BD
  unipair.token0Price = ZERO_BD
  unipair.token1Price = ZERO_BD

  unipair.version = ZERO_BI

  unipair.save()

  UniPairTemplate.create(addr)
}

export function handleNewPair(event: PairCreated): void {
  // load factory (create if first exchange)
  let factory = UniswapFactory.load(FACTORY_ADDRESS)
  if (factory === null) {
    factory = new UniswapFactory(FACTORY_ADDRESS)
    factory.pairCount = 0
    factory.totalVolumeETH = ZERO_BD
    factory.totalLiquidityETH = ZERO_BD
    factory.totalVolumeUSD = ZERO_BD
    factory.untrackedVolumeUSD = ZERO_BD
    factory.totalLiquidityUSD = ZERO_BD
    factory.txCount = ZERO_BI

    // create new bundle
    let bundle = new Bundle('1')
    bundle.ethPrice = ZERO_BD
    bundle.save()

    // register all uniswap pairs
    registerUniPair(
      Address.fromString(USDC_WETH_PAIR),
      Address.fromString(USDC),
      Address.fromString(WETH)
    )

    registerUniPair(
      Address.fromString(DAI_WETH_PAIR),
      Address.fromString(DAI),
      Address.fromString(WETH)
    )
  }

  factory.pairCount = factory.pairCount + 1
  factory.save()

  // create the tokens
  let token0 = createOrLoadToken(event.params.token0)
  let token1 = createOrLoadToken(event.params.token1)

  // fetch info if null

  let pair = new Pair(event.params.pair.toHexString()) as Pair
  pair.token0 = token0.id
  pair.token1 = token1.id
  pair.liquidityProviderCount = ZERO_BI
  pair.createdAtTimestamp = event.block.timestamp
  pair.createdAtBlockNumber = event.block.number
  pair.txCount = ZERO_BI
  pair.reserve0 = ZERO_BD
  pair.reserve1 = ZERO_BD
  pair.trackedReserveETH = ZERO_BD
  pair.reserveETH = ZERO_BD
  pair.reserveUSD = ZERO_BD
  pair.totalSupply = ZERO_BD
  pair.volumeToken0 = ZERO_BD
  pair.volumeToken1 = ZERO_BD
  pair.volumeUSD = ZERO_BD
  pair.untrackedVolumeUSD = ZERO_BD
  pair.token0Price = ZERO_BD
  pair.token1Price = ZERO_BD

  // create the tracked contract based on the template
  PairTemplate.create(event.params.pair)

  // save updated values
  token0.save()
  token1.save()
  pair.save()
  factory.save()
}