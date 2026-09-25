import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


data = pd.read_csv('data/creditcard.csv')
X = data.drop('Class', axis=1)
y = data['Class']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

clf = RandomForestClassifier(n_estimators=50, n_jobs=-1)
clf.fit(X_train, y_train)

replay_stream = X_test.copy()
replay_stream['Class'] = y_test
replay_stream.to_csv('data/replay_stream.csv', index=False)
joblib.dump(clf, 'fraud_model.joblib')
