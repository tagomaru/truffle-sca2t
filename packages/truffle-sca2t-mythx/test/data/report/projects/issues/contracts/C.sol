pragma solidity ^0.5.0;
contract C {
  uint public a;
  function add(uint b) public {
    a = a + b;
  }
}