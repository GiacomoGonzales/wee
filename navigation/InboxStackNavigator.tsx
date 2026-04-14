import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ParticipantData } from '../services/messagesService';

import InboxScreen from '../screens/InboxScreen';
import ConversationScreen from '../screens/ConversationScreen';

export type InboxStackParamList = {
  InboxList: undefined;
  Conversation: {
    conversationId?: string;
    otherUserId?: string;
    otherUserData?: ParticipantData;
  };
};

const Stack = createStackNavigator<InboxStackParamList>();

const InboxStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InboxList" component={InboxScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
    </Stack.Navigator>
  );
};

export default InboxStackNavigator;
