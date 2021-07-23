// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./libraries/BoringMath.sol";
import "./libraries/SignedSafeMath.sol";
import "./libraries/BoringERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/************************************************************************************************
Originally from
https://github.com/sushiswap/sushiswap/blob/master/contracts/MasterChefV2.sol
and
https://github.com/sdaoswap/sushiswap/blob/master/contracts/MasterChef.sol
This source code has been modified from the original, which was copied from the github repository
at commit hash 10148a31d9192bc803dac5d24fe0319b52ae99a4.
*************************************************************************************************/


contract SDAOTokenStaking is Ownable {
  using BoringMath for uint256;
  using BoringMath128 for uint128;
  using BoringERC20 for IERC20;
  using SignedSafeMath for int256;

/** ==========  Constants  ========== */

  uint256 private constant ACC_REWARDS_PRECISION = 1e18;

  /**
   * @dev ERC20 token used to distribute rewards.
   */
  IERC20 public immutable rewardsToken;

/** ==========  Structs  ========== */

  /**
   * @dev Info of each user.
   * @param amount LP token amount the user has provided.
   * @param rewardDebt The amount of rewards entitled to the user.
   */
  struct UserInfo {
    uint256 amount;
    uint256 rewardDebt;
  }

  /**
   * @dev Info of each rewards pool.
   * @param accRewardsPerShare Total rewards accumulated per staked token.
   * @param lastRewardBlock Last time rewards were updated for the pool.
   * @param allocPoint The amount of allocation points assigned to the pool.
   */
  struct PoolInfo {
    uint256 tokenPerBlock;
    uint256 lpSupply;
    uint128 accRewardsPerShare;
    uint64 lastRewardBlock;
    uint endOfEpochBlock;
    uint64 allocPoint;
  }

/** ==========  Events  ========== */

  event Deposit(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
  event Withdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
  event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount, address indexed to);
  event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
  event LogPoolAddition(uint256 indexed pid, uint256 allocPoint, IERC20 indexed lpToken);
  event LogSetPool(uint256 indexed pid, uint256 allocPoint, bool overwrite);
  event LogUpdatePool(uint256 indexed pid, uint64 lastRewardBlock, uint256 lpSupply, uint256 accRewardsPerShare);
  event RewardsAdded(uint256 amount);
  event PointsAllocatorSet(address pointsAllocator);

/** ==========  Storage  ========== */
  /**
   * @dev Indicates whether a staking pool exists for a given staking token.
   */
  mapping(address => bool) public stakingPoolExists;

  /**
   * @dev Info of each staking pool.
   */
  PoolInfo[] public poolInfo;

  /**
   * @dev Address of the LP token for each staking pool.
   */
  mapping(uint256 => IERC20) public lpToken;


  /**
   * @dev Info of each user that stakes tokens.
   */
  mapping(uint256 => mapping(address => UserInfo)) public userInfo;

  /**
   * @dev Total allocation points. Must be the sum of all allocation points in all pools.
   */
  uint256 public totalAllocPoint = 0;

  /**
   * @dev Account allowed to allocate points.
   */
  address public pointsAllocator;

  /**
   * @dev Total rewards received from governance for distribution.
   * Used to return remaining rewards if staking is canceled.
   */
  uint256 public totalRewardsReceived = 0;

  function poolLength() external view returns (uint256) {
    return poolInfo.length;
  }

/** ==========  Modifiers  ========== */

  /**
   * @dev Ensure the caller is allowed to allocate points.
   */
  modifier onlyPointsAllocatorOrOwner {
    require(
      msg.sender == pointsAllocator || msg.sender == owner(),
      "MultiTokenStaking: not authorized to allocate points"
    );
    _;
  }

/** ==========  Constructor  ========== */

  constructor(address _rewardsToken) public {
    rewardsToken = IERC20(_rewardsToken);
  }

/** ==========  Governance  ========== */

  /**
   * @dev Set the address of the points allocator.
   * This account will have the ability to set allocation points for LP rewards.
   */
  function setPointsAllocator(address _pointsAllocator) external onlyOwner {
    pointsAllocator = _pointsAllocator;
    emit PointsAllocatorSet(_pointsAllocator);
  }

  /**
   * @dev Add rewards to be distributed.
   *
   * Note: This function must be used to add rewards if the owner
   * wants to retain the option to cancel distribution and reclaim
   * undistributed tokens.
   */
  function addRewards(uint256 amount) external onlyPointsAllocatorOrOwner {
   require(rewardsToken.balanceOf(msg.sender) > 0, "ERC20: not enough tokens to transfer");

    rewardsToken.safeTransferFrom(msg.sender, address(this), amount);
    totalRewardsReceived = totalRewardsReceived.add(amount);
    emit RewardsAdded(amount);
  }



/** ==========  Pools  ========== */
  /**
   * @dev Add a new LP to the pool.
   * Can only be called by the owner or the points allocator.
   * @param _allocPoint AP of the new pool.
   * @param _lpToken Address of the LP ERC-20 token.
   */
  function add(uint256 _allocPoint, IERC20 _lpToken,uint256 _sdaoPerBlock,uint64 _endofepochblock) public onlyPointsAllocatorOrOwner {
    require(!stakingPoolExists[address(_lpToken)], " Staking pool already exists.");
    
    uint256 pid = poolInfo.length;
    totalAllocPoint = totalAllocPoint.add(_allocPoint);
    lpToken[pid] = _lpToken;

    poolInfo.push(PoolInfo({
      allocPoint: _allocPoint.to64(),
      tokenPerBlock: _sdaoPerBlock,
      endOfEpochBlock:_endofepochblock,
      lastRewardBlock: block.number.to64(),
      lpSupply:100,
      accRewardsPerShare: 0
    }));

    stakingPoolExists[address(_lpToken)] = true;

    emit LogPoolAddition(pid, _allocPoint, _lpToken);
  }

  /**
   * @dev Update the given pool's allocation points.
   * Can only be called by the owner or the points allocator.
   * @param _pid The index of the pool. See `poolInfo`.
   * @param _allocPoint New AP of the pool.
   */
  function set(uint256 _pid, uint256 _allocPoint, bool _overwrite) public onlyPointsAllocatorOrOwner {
    totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
    poolInfo[_pid].allocPoint = _allocPoint.to64();

    emit LogSetPool(_pid, _allocPoint, _overwrite);
  }

  /**
   * @dev Update reward variables for all pools in `pids`.
   * Note: This can become very expensive.
   * @param pids Pool IDs of all to be updated. Make sure to update all active pools.
   */
  function massUpdatePools(uint256[] calldata pids) external onlyOwner {
    uint256 len = pids.length;
    for (uint256 i = 0; i < len; ++i) {
      updatePool(pids[i]);
    }
  }

  /**
   * @dev Update reward variables of the given pool.
   * @param _pid The index of the pool. See `poolInfo`.
   * @return pool Returns the pool that was updated.
   */
  // function updatePool(uint256 _pid) private returns (PoolInfo memory pool) {
  //   pool = poolInfo[_pid];
  //   if (block.number > pool.lastRewardBlock) {
  //     //uint256 lpSupply = lpToken[_pid].balanceOf(address(this));
  //     uint256 lpSupply = pool.lpSupply;

  //     if (lpSupply > 0) {
  //         uint256 blocks = block.number.sub(pool.lastRewardBlock);
  //         uint256 sdaoReward = blocks.mul(sdaoPerBlock(_pid));
  //         pool.accRewardsPerShare = pool.accRewardsPerShare.add((sdaoReward.mul(ACC_REWARDS_PRECISION) / lpSupply).to128());
  //     }

  //     pool.lastRewardBlock = block.number.to64();
  //     poolInfo[_pid] = pool;
  //     emit LogUpdatePool(_pid, pool.lastRewardBlock, lpSupply, pool.accRewardsPerShare);
  //   }
  // }


 function updatePool(uint256 _pid) private returns (PoolInfo memory pool) {
    pool = poolInfo[_pid];
    uint256 lpSupply = pool.lpSupply;

    if (block.number > pool.lastRewardBlock && pool.lastRewardBlock < pool.endOfEpochBlock) {

       if(lpSupply > 0){
         
           uint256 blocks;
           if(block.number < pool.endOfEpochBlock) {
             blocks = block.number.sub(pool.lastRewardBlock);
           } else {
             blocks = pool.endOfEpochBlock.sub(pool.lastRewardBlock);
          }

          uint256 sdaoReward = blocks.mul(sdaoPerBlock(_pid));
          pool.accRewardsPerShare = pool.accRewardsPerShare.add((sdaoReward.mul(ACC_REWARDS_PRECISION) / lpSupply).to128());

       }

       pool.lastRewardBlock = block.number.to64();
       poolInfo[_pid] = pool;
       emit LogUpdatePool(_pid, pool.lastRewardBlock, lpSupply, pool.accRewardsPerShare);

    }

  }



/** ==========  Users  ========== */

  /**
   * @dev View function to see pending rewards on frontend.
   * @param _pid The index of the pool. See `poolInfo`.
   * @param _user Address of user.
   * @return pending rewards for a given user.
   */
  function pendingRewards(uint256 _pid, address _user) external view returns (uint256 pending) {
    PoolInfo memory pool = poolInfo[_pid];
    UserInfo storage user = userInfo[_pid][_user];
    uint256 accRewardsPerShare = pool.accRewardsPerShare;
    //uint256 lpSupply = lpToken[_pid].balanceOf(address(this));
    uint256 lpSupply = pool.lpSupply;

     if(lpSupply > 0){

       uint256 blocks;
      if(block.number < pool.endOfEpochBlock && pool.lastRewardBlock < pool.endOfEpochBlock) {
          blocks = block.number.sub(pool.lastRewardBlock);
      } else {
        blocks = pool.endOfEpochBlock.sub(pool.lastRewardBlock);
      }
      
      uint256 sdaoReward = blocks.mul(sdaoPerBlock(_pid));
      accRewardsPerShare = accRewardsPerShare.add(sdaoReward.mul(ACC_REWARDS_PRECISION) / lpSupply);

    }

    pending = uint256(user.amount.mul(accRewardsPerShare) / ACC_REWARDS_PRECISION).sub(user.rewardDebt);
  }


    function sdaoPerBlock(uint256 _pid) public view returns (uint256 amount) {
        PoolInfo memory pool = poolInfo[_pid];
        amount = uint256(pool.tokenPerBlock);
    }

  /**
   * @dev Deposit LP tokens to earn rewards.
   * @param _pid The index of the pool. See `poolInfo`.
   * @param _amount LP token amount to deposit.
   * @param _to The receiver of `_amount` deposit benefit.
   */
  function deposit(uint256 _pid, uint256 _amount, address _to) public {
    PoolInfo memory pool = updatePool(_pid);
    UserInfo storage user = userInfo[_pid][_to];

    // check if epoch as ended
    require (pool.endOfEpochBlock > block.number,"This pool epoch has ended. Please join staking new cession");
    
    user.amount = user.amount.add(_amount);
    user.rewardDebt = user.rewardDebt.add(uint256(_amount.mul(pool.accRewardsPerShare) / ACC_REWARDS_PRECISION));

    // Interactions
    lpToken[_pid].safeTransferFrom(msg.sender, address(this), _amount);
    pool.lpSupply = pool.lpSupply.add(_amount);

    emit Deposit(msg.sender, _pid, _amount, _to);
  }

  /**
   * @dev Withdraw LP tokens from the staking contract.
   * @param _pid The index of the pool. See `poolInfo`.
   * @param _amount LP token amount to withdraw.
   * @param _to Receiver of the LP tokens.
   */
  function withdraw(uint256 _pid, uint256 _amount, address _to) public {

    require(_to != address(0), "ERC20: transfer to the zero address");

    PoolInfo memory pool = updatePool(_pid);
    UserInfo storage user = userInfo[_pid][msg.sender];

    // Effects
    user.rewardDebt = user.rewardDebt.sub(uint256(_amount.mul(pool.accRewardsPerShare) / ACC_REWARDS_PRECISION));
    user.amount = user.amount.sub(_amount);

    // Interactions
    lpToken[_pid].safeTransfer(_to, _amount);
    pool.lpSupply = pool.lpSupply.sub(_amount);

    emit Withdraw(msg.sender, _pid, _amount, _to);
  }

  /**
   * @dev Harvest proceeds for transaction sender to `_to`.
   * @param _pid The index of the pool. See `poolInfo`.
   * @param _to Receiver of rewards.
   */
   function harvest(uint256 _pid, address _to) public {
    require(_to != address(0), "ERC20: transfer to the zero address");

    PoolInfo memory pool = updatePool(_pid);
    UserInfo storage user = userInfo[_pid][msg.sender];
    uint256 accumulatedRewards = uint256(user.amount.mul(pool.accRewardsPerShare) / ACC_REWARDS_PRECISION);
    uint256 _pendingRewards = accumulatedRewards.sub(user.rewardDebt);

    // Effects
    user.rewardDebt = accumulatedRewards;

    // Interactions
    rewardsToken.safeTransfer(_to, _pendingRewards);

    emit Harvest(msg.sender, _pid, _pendingRewards);
  }

  /**
   * @dev Withdraw LP tokens and harvest accumulated rewards, sending both to `to`.
   * @param _pid The index of the pool. See `poolInfo`.
   * @param _amount LP token amount to withdraw.
   * @param _to Receiver of the LP tokens and rewards.
   */
  function withdrawAndHarvest(uint256 _pid, uint256 _amount, address _to) public {
    require(_to != address(0), "ERC20: transfer to the zero address");

    PoolInfo memory pool = updatePool(_pid);
    UserInfo storage user = userInfo[_pid][msg.sender];
    uint256 accumulatedRewards = uint256(user.amount.mul(pool.accRewardsPerShare) / ACC_REWARDS_PRECISION);
    uint256 _pendingRewards = accumulatedRewards.sub(user.rewardDebt);

    // Effects
    user.rewardDebt = accumulatedRewards.sub(uint256(_amount.mul(pool.accRewardsPerShare) / ACC_REWARDS_PRECISION));
    user.amount = user.amount.sub(_amount);

    // Interactions
    rewardsToken.safeTransfer(_to, _pendingRewards);
    lpToken[_pid].safeTransfer(_to, _amount);

    pool.lpSupply = pool.lpSupply.sub(_amount);

    emit Harvest(msg.sender, _pid, _pendingRewards);
    emit Withdraw(msg.sender, _pid, _amount, _to);
  }

  /**
   * @dev Withdraw without caring about rewards. EMERGENCY ONLY.
   * @param _pid The index of the pool. See `poolInfo`.
   * @param _to Receiver of the LP tokens.
   */
  function emergencyWithdraw(uint256 _pid, address _to) public {
    require(_to != address(0), "ERC20: transfer to the zero address");

    UserInfo storage user = userInfo[_pid][msg.sender];
    uint256 amount = user.amount;
    user.amount = 0;
    user.rewardDebt = 0;
    // Note: transfer can fail or succeed if `amount` is zero.
    lpToken[_pid].safeTransfer(_to, amount);
    
    PoolInfo memory pool = updatePool(_pid);
    pool.lpSupply = pool.lpSupply.sub(amount);

    emit EmergencyWithdraw(msg.sender, _pid, amount, _to);
  }

  function withdrawETHAndAnyTokens(address token) external onlyOwner {
    msg.sender.send(address(this).balance);
    IERC20 Token = IERC20(token);
    uint256 currentTokenBalance = Token.balanceOf(address(this));
    Token.safeTransfer(msg.sender, currentTokenBalance); 
  }


}